import time
import requests
import json
from typing import List, Dict, Any

from backend.utils.logger import logger
from backend.schema._input import ClientInput, ClientUpdateInput


class APIService:
    _username: str | None = None
    _cached_url: str | None = None
    _token_time: float | None = None
    _token_expiry: float = 300
    _session: requests.Session | None = None

    def __init__(self, url: str, username: str, password: str):
        self.url = url if url.endswith("/") else url + "/"
        self.username = username
        self.password = password

    def _get_session(self) -> requests.Session:
        if APIService._session is None:
            APIService._session = requests.Session()
            APIService._session.headers.update(
                {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
            )
        return APIService._session

    def _login(self, force: bool = False):
        now = time.time()

        if not force and (
            APIService._username == self.username
            and APIService._cached_url == self.url
            and APIService._token_time
            and now - APIService._token_time < APIService._token_expiry
        ):
            return

        session = self._get_session()

        response = session.post(
            f"{self.url}login",
            data={"username": self.username, "password": self.password},
        )

        if response.status_code != 200:
            raise Exception(f"Login failed: {response.status_code} - {response.text}")

        APIService._cached_url = self.url
        APIService._token_time = now
        APIService._username = self.username

    def _safe_json(self, response: requests.Response) -> dict:
        try:
            return response.json()
        except ValueError:
            logger.warning(f"Invalid JSON: {response.text}")
            return {}

    def _request_with_retry(self, method: str, endpoint: str, **kwargs):
        self._login()
        session = self._get_session()

        url = f"{self.url}{endpoint}"
        response = session.request(method, url, **kwargs)

        if response.status_code in (401, 403, 404):
            self._login(force=True)
            response = session.request(method, url, **kwargs)

        response.raise_for_status()
        return response

    async def get_inbounds(self) -> List[Dict[str, Any]]:
        response = self._request_with_retry("GET", "panel/api/inbounds/list")
        data = self._safe_json(response)
        return data.get("obj", [])

    async def test_connection(self) -> bool:
        try:
            response = self._request_with_retry("GET", "panel/api/server/status")
            return self._safe_json(response).get("success", False)
        except Exception:
            return False

    async def create_client(
        self, inbound_id: int, flow: str, client: ClientInput
    ) -> bool:
        settings_dict = {
            "clients": [
                {
                    "id": client.id,
                    "subId": client.sub_id,
                    "email": client.email,
                    "flow": flow,
                    "enable": client.enable,
                    "totalGB": client.total,
                    "expiryTime": client.expiry_time,
                    "reset": 0,
                    "limitIp": 0,
                    "comment": "",
                }
            ]
        }

        data = {"id": inbound_id, "settings": json.dumps(settings_dict)}

        response = self._request_with_retry(
            "POST", "panel/api/inbounds/addClient", json=data
        )

        return self._safe_json(response).get("success", False)

    async def update_client(
        self, uuid: str, inbound_id: int, flow: str, client: ClientUpdateInput
    ) -> bool:
        settings_dict = {
            "clients": [
                {
                    "id": uuid,
                    "subId": client.sub_id,
                    "email": client.email,
                    "flow": flow,
                    "enable": client.enable,
                    "totalGB": client.total,
                    "expiryTime": client.expiry_time,
                }
            ]
        }

        data = {"id": inbound_id, "settings": json.dumps(settings_dict)}

        response = self._request_with_retry(
            "POST", f"panel/api/inbounds/updateClient/{uuid}", json=data
        )

        return self._safe_json(response).get("success", False)

    async def delete_client(self, inbound_id: int, uuid: str) -> bool:
        response = self._request_with_retry(
            "POST", f"panel/api/inbounds/{inbound_id}/delClient/{uuid}"
        )
        return self._safe_json(response).get("success", False)

    async def reset_client_usage(self, inbound_id: int, email: str) -> bool:
        response = self._request_with_retry(
            "POST", f"panel/api/inbounds/{inbound_id}/resetClientTraffic/{email}"
        )
        return self._safe_json(response).get("success", False)

    async def get_online_clients(self) -> List[str]:
        response = self._request_with_retry("POST", "panel/api/inbounds/onlines")
        data = self._safe_json(response)
        return data.get("obj", []) or []

    async def get_client_by_email(self, email: str) -> dict | bool:
        try:
            response = self._request_with_retry(
                "GET", f"panel/api/inbounds/getClientTraffics/{email}"
            )
            data = self._safe_json(response)
            return data.get("obj", {})
        except Exception as e:
            return False

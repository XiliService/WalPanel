from datetime import datetime
from py3xui import AsyncApi
from py3xui.inbound.inbound import Inbound
from py3xui.client.client import Client
from py3xui.server.server import Server

from backend.schema._input import ClientInput, ClientUpdateInput


class APIService:
    _api_instances = {}
    _last_login_times = {}

    def __init__(self, url: str, username: str, password: str):
        self.url = url
        self.username = username
        self.password = password

        if url not in APIService._api_instances:
            APIService._api_instances[url] = AsyncApi(url, username, password)

        self.api = APIService._api_instances[url]

    async def ensure_login(self):
        last_login = APIService._last_login_times.get(self.url)

        if last_login is None or (datetime.now() - last_login).total_seconds() > 3500:
            try:
                await self.api.login()
                APIService._last_login_times[self.url] = datetime.now()
            except Exception as e:
                APIService._api_instances[self.url] = AsyncApi(
                    self.url, self.username, self.password
                )
                self.api = APIService._api_instances[self.url]
                await self.api.login()
                APIService._last_login_times[self.url] = datetime.now()

    async def test_connection(self) -> Server:
        try:
            api = AsyncApi(self.url, self.username, self.password)
            await api.login()
            info = await api.server.get_status()
            return info
        except Exception as e:
            return None

    async def get_inbound(self, inbound_id: int) -> Inbound:
        await self.ensure_login()
        inbound = await self.api.inbound.get_by_id(inbound_id)
        return inbound

    async def get_all_inbounds(self) -> list[Inbound]:
        await self.ensure_login()
        inbounds = await self.api.inbound.get_list()
        return inbounds

    async def get_all_online_clients(self) -> list[str]:
        clients = await self.api.client.online()
        return clients

    async def add_client(self, inbound_id: int, inbound_flow: str, client: ClientInput):
        await self.ensure_login()
        data = Client(
            email=client.email,
            id=client.id,
            enable=client.enable,
            expiry_time=client.expiry_time,
            totalGB=client.total,
            flow=inbound_flow if inbound_flow else client.flow,
            sub_id=client.sub_id,
        )
        await self.api.client.add(inbound_id, [data])

    async def get_client_by_email(self, email: str) -> list[Client]:
        clients = await self.api.client.get_by_email(email)
        return clients

    async def update_client(
        self, uuid: str, inbound_id: int, inbound_flow: str, client: ClientUpdateInput
    ):
        await self.ensure_login()
        data = Client(
            email=client.email,
            id=uuid,
            uuid=uuid,
            enable=client.enable,
            expiry_time=client.expiry_time,
            totalGB=client.total,
            flow=inbound_flow if inbound_flow else client.flow,
            sub_id=client.sub_id,
            inbound_id=inbound_id,
        )
        await self.api.client.update(uuid, data)

    async def reset_client_usage(self, inbound_id: int, email: str):
        await self.ensure_login()
        await self.api.client.reset_stats(inbound_id, email)

    async def delete_client(self, inbound_id: int, uuid: str):
        await self.ensure_login()
        await self.api.client.delete(inbound_id, uuid)

import { useEffect, useState } from 'react'
import {
    Download,
    Upload,
    FileText,
    Bell,
    Trash2,
    Database,
    RotateCcw,
    Eye,
    Plus,
} from 'lucide-react'
import { superadminAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface NewsItem {
    id: number
    message: string
    created_at: string
}

export function SettingsPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [logsLoading, setLogsLoading] = useState(false)
    const [backupLoading, setBackupLoading] = useState(false)
    const [restoreLoading, setRestoreLoading] = useState(false)
    const [showLogsModal, setShowLogsModal] = useState(false)

    // News state
    const [news, setNews] = useState<NewsItem[]>([])
    const [newsLoading, setNewsLoading] = useState(false)
    const [newNewsMessage, setNewNewsMessage] = useState('')
    const [addingNews, setAddingNews] = useState(false)
    const [newsToDelete, setNewsToDelete] = useState<number | null>(null)
    const [deletingNews, setDeletingNews] = useState(false)
    const [showNewsDialog, setShowNewsDialog] = useState(false)
    const [showAddNewsDialog, setShowAddNewsDialog] = useState(false)

    useEffect(() => {
        fetchNews()
    }, [])

    const fetchNews = async () => {
        try {
            setNewsLoading(true)
            const newsData = await superadminAPI.getNews()
            setNews(newsData)
        } catch (err: any) {
            console.error('Failed to fetch news:', err)
            alert(err?.message || 'Failed to fetch news')
        } finally {
            setNewsLoading(false)
        }
    }

    const fetchLogs = async () => {
        try {
            setLogsLoading(true)
            const logsData = await superadminAPI.getLogs()
            setLogs(logsData)
        } catch (err: any) {
            console.error('Failed to fetch logs:', err)
            alert(err?.message || 'Failed to fetch logs')
        } finally {
            setLogsLoading(false)
        }
    }

    const handleDownloadBackup = async () => {
        try {
            setBackupLoading(true)
            const blob = await superadminAPI.downloadBackup()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `backup-${new Date().toISOString().split('T')[0]}.db`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err: any) {
            console.error('Failed to download backup:', err)
            alert(err?.message || 'Failed to download backup')
        } finally {
            setBackupLoading(false)
        }
    }

    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setRestoreLoading(true)
            const message = await superadminAPI.restoreBackup(file)
            alert(message)
        } catch (err: any) {
            console.error('Failed to restore backup:', err)
            alert(err?.message || 'Failed to restore backup')
        } finally {
            setRestoreLoading(false)
            event.target.value = ''
        }
    }

    const handleAddNews = async () => {
        if (!newNewsMessage.trim()) {
            alert('Please enter a news message')
            return
        }

        try {
            setAddingNews(true)
            await superadminAPI.addNews(newNewsMessage)
            setNewNewsMessage('')
            fetchNews()
        } catch (err: any) {
            console.error('Failed to add news:', err)
            alert(err?.message || 'Failed to add news')
        } finally {
            setAddingNews(false)
        }
    }

    const handleDeleteNews = async () => {
        if (!newsToDelete) return

        try {
            setDeletingNews(true)
            await superadminAPI.deleteNews(newsToDelete)
            setNewsToDelete(null)
            fetchNews()
        } catch (err: any) {
            console.error('Failed to delete news:', err)
            alert(err?.message || 'Failed to delete news')
        } finally {
            setDeletingNews(false)
        }
    }

    return (
        <div className="space-y-6 p-4 md:p-6 max-w-full overflow-x-hidden">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage database, logs, and ...</p>
            </div>

            {/* 4 Main Boxes */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {/* Backup Box */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-500" />
                            Database Backup
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Download a backup of the current database.
                        </p>
                        <Button
                            onClick={handleDownloadBackup}
                            disabled={backupLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {backupLoading ? 'Downloading...' : 'Download Backup'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Restore Box */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-amber-500" />
                            Database Restore
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Restore database from a backup file.
                        </p>
                        <div className="space-y-2">
                            <Button
                                onClick={() => document.getElementById('restore-file-input')?.click()}
                                disabled={restoreLoading}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {restoreLoading ? 'Restoring...' : 'Select Backup File'}
                            </Button>
                            <Input
                                id="restore-file-input"
                                type="file"
                                accept=".db"
                                onChange={handleRestoreBackup}
                                disabled={restoreLoading}
                                className="hidden"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Logs Box */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-violet-500" />
                            Application Logs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            View the latest application logs.
                        </p>
                        <Button
                            onClick={() => {
                                fetchLogs()
                                setShowLogsModal(true)
                            }}
                            disabled={logsLoading}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            {logsLoading ? 'Loading...' : 'Show Logs'}
                        </Button>
                    </CardContent>
                </Card>

                {/* News Box */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-rose-500" />
                            News Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Manage system news and announcements.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    fetchNews()
                                    setShowNewsDialog(true)
                                }}
                                disabled={newsLoading}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                {newsLoading ? 'Loading...' : 'Show News'}
                            </Button>
                            <Button
                                onClick={() => setShowAddNewsDialog(true)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create News
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Logs Modal */}
            <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Logs</DialogTitle>
                        <DialogDescription>
                            Latest 10 application logs
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Button
                            onClick={fetchLogs}
                            disabled={logsLoading}
                            size="sm"
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {logsLoading ? 'Refreshing...' : 'Refresh Logs'}
                        </Button>
                        <div className="bg-muted p-4 rounded-md max-h-96 overflow-y-auto border">
                            {logs.length > 0 ? (
                                <pre className="text-xs whitespace-pre-wrap font-mono">
                                    {logs.join('\n')}
                                </pre>
                            ) : (
                                <p className="text-sm text-muted-foreground">No logs available</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* News Display Modal */}
            <Dialog open={showNewsDialog} onOpenChange={setShowNewsDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Current News</DialogTitle>
                        <DialogDescription>
                            All system announcements
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {news.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {news.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 bg-muted rounded-md border flex items-start justify-between gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm break-words">{item.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(item.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setNewsToDelete(item.id)}
                                            size="sm"
                                            variant="ghost"
                                            className="shrink-0 hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No news available
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add News Modal */}
            <Dialog open={showAddNewsDialog} onOpenChange={setShowAddNewsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create News</DialogTitle>
                        <DialogDescription>
                            Add a new system announcement
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Message</label>
                            <Textarea
                                placeholder="Enter news message..."
                                value={newNewsMessage}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNewsMessage(e.target.value)}
                                className="mt-2 min-h-[100px]"
                                disabled={addingNews}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                onClick={() => {
                                    setShowAddNewsDialog(false)
                                    setNewNewsMessage('')
                                }}
                                variant="outline"
                                disabled={addingNews}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddNews}
                                disabled={addingNews || !newNewsMessage.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {addingNews ? 'Creating...' : 'Create News'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete News Confirmation Dialog */}
            <AlertDialog open={!!newsToDelete} onOpenChange={() => newsToDelete && setNewsToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete News</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this news? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteNews}
                            disabled={deletingNews}
                            className="bg-red-600 hover:bg-red-700 text-white">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingNews ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog >
        </div >
    )
}
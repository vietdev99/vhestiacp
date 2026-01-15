import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  HardDrive, Download, Trash2, RefreshCw, Archive, Calendar, 
  Settings, Save, Cloud, Folder, Loader2, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Backups() {
  const [activeTab, setActiveTab] = useState('list');
  const { isAdmin } = useAuth();

  return (
    <div>
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Backups</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage your account backups
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'list' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 dark:bg-dark-border'
              }`}
            >
              Backups
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                activeTab === 'settings' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 dark:bg-dark-border'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        )}
      </div>

      {activeTab === 'list' && <BackupsList />}
      {activeTab === 'settings' && isAdmin && <BackupSettings />}
    </div>
  );
}

function BackupsList() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await api.get('/api/backups');
      return res.data.backups || [];
    }
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/backups');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['backups']);
      toast.success('Backup creation started');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create backup');
    }
  });

  const formatSize = (mb) => {
    if (!mb || mb === '0') return '0 MB';
    const num = parseFloat(mb);
    if (num >= 1024) return `${(num / 1024).toFixed(1)} GB`;
    return `${num} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-600">
        Failed to load backups. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => createBackupMutation.mutate()}
          disabled={createBackupMutation.isPending}
          className="btn btn-primary"
        >
          {createBackupMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 mr-2" />
              Create Backup
            </>
          )}
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Backup
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {data.map((item) => (
                <tr key={item.backup} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{item.backup}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-dark-muted">
                      <Calendar className="w-4 h-4" />
                      {formatDate(item.DATE)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-dark-muted">
                    {formatSize(item.SIZE)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-blue-600"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              No backups yet. Create your first backup to get started.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {data.length} {data.length === 1 ? 'backup' : 'backups'}
      </div>
    </>
  );
}

function BackupSettings() {
  const queryClient = useQueryClient();
  const [backupDir, setBackupDir] = useState('/backup');
  const [backups, setBackups] = useState(3);
  const [backupGzip, setBackupGzip] = useState(5);
  const [backupMode, setBackupMode] = useState('local');
  const [backupRemote, setBackupRemote] = useState('');

  // Fetch backup settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: async () => {
      const res = await api.get('/api/backups/settings');
      return res.data;
    }
  });

  // Fetch rclone remotes
  const { data: remotesData } = useQuery({
    queryKey: ['rclone-remotes'],
    queryFn: async () => {
      const res = await api.get('/api/backups/rclone-remotes');
      return res.data;
    }
  });

  // Initialize form with fetched data
  useEffect(() => {
    if (settings) {
      setBackupDir(settings.backupDir || '/backup');
      setBackups(settings.backups || 3);
      setBackupGzip(settings.backupGzip || 5);
      setBackupMode(settings.backupMode || 'local');
      setBackupRemote(settings.backupRemote || '');
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/backups/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['backup-settings']);
      toast.success('Backup settings saved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      backupDir,
      backups,
      backupGzip,
      backupMode,
      backupRemote
    });
  };

  const remotes = remotesData?.remotes || [];

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Backup Configuration
      </h2>

      {/* Backup Directory */}
      <div>
        <label className="block text-sm font-medium mb-1">
          <Folder className="w-4 h-4 inline mr-1" />
          Backup Directory
        </label>
        <input
          type="text"
          value={backupDir}
          onChange={(e) => setBackupDir(e.target.value)}
          className="input"
          placeholder="/backup"
        />
        <p className="text-xs text-gray-500 mt-1">
          Local directory where backups are stored
        </p>
      </div>

      {/* Number of Backups */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Number of Backups to Keep
        </label>
        <input
          type="number"
          value={backups}
          onChange={(e) => setBackups(parseInt(e.target.value))}
          min={1}
          max={99}
          className="input w-32"
        />
        <p className="text-xs text-gray-500 mt-1">
          Older backups will be automatically removed
        </p>
      </div>

      {/* Compression Level */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Compression Level (gzip)
        </label>
        <select
          value={backupGzip}
          onChange={(e) => setBackupGzip(parseInt(e.target.value))}
          className="input w-48"
        >
          <option value={1}>1 - Fastest</option>
          <option value={3}>3 - Fast</option>
          <option value={5}>5 - Normal</option>
          <option value={7}>7 - Good</option>
          <option value={9}>9 - Best (Slowest)</option>
        </select>
      </div>

      {/* Backup Mode */}
      <div className="border-t border-gray-200 dark:border-dark-border pt-6">
        <label className="block text-sm font-medium mb-2">
          <Cloud className="w-4 h-4 inline mr-1" />
          Remote Storage
        </label>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="backupMode"
              value="local"
              checked={backupMode === 'local'}
              onChange={(e) => setBackupMode(e.target.value)}
              className="text-primary-600"
            />
            <span>Local only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="backupMode"
              value="rclone"
              checked={backupMode === 'rclone'}
              onChange={(e) => setBackupMode(e.target.value)}
              className="text-primary-600"
            />
            <span>Sync to remote (rclone)</span>
          </label>
        </div>
      </div>

      {/* Rclone Remote Selection */}
      {backupMode === 'rclone' && (
        <div className="ml-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
          <label className="block text-sm font-medium">
            Select Rclone Remote
          </label>
          {remotes.length > 0 ? (
            <select
              value={backupRemote}
              onChange={(e) => setBackupRemote(e.target.value)}
              className="input"
            >
              <option value="">-- Select a remote --</option>
              {remotes.map((remote) => (
                <option key={remote.name} value={remote.name}>
                  {remote.name} ({remote.type})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-500 dark:text-dark-muted">
              No rclone remotes configured.{' '}
              <a href="/admin/rclone" className="text-primary-600 hover:underline">
                Configure rclone →
              </a>
            </div>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Backups will be synced to this remote after creation
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-border">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn btn-primary"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {saveMutation.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Settings saved successfully
        </div>
      )}
    </div>
  );
}


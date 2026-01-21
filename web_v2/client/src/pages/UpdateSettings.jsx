import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  GitBranch,
  FileText,
  Settings,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// VHestiaCP Version - Update this when releasing new versions
const VHESTIACP_VERSION = '2.0.1';

export default function UpdateSettings() {
  const queryClient = useQueryClient();
  const [expandedLog, setExpandedLog] = useState(null);
  const [logContent, setLogContent] = useState('');
  const [loadingLog, setLoadingLog] = useState(false);

  // Fetch update status
  const { data: updateStatus, isLoading, refetch } = useQuery({
    queryKey: ['update-status'],
    queryFn: async () => {
      const res = await api.get('/api/system/update/status');
      return res.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Check for updates mutation
  const checkUpdateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/system/update/check');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['update-status']);
      if (data.update_available) {
        toast.success(`Update available! ${data.commits_behind} commits behind`);
      } else {
        toast.success('You are up to date');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to check for updates');
    }
  });

  // Install update mutation
  const installUpdateMutation = useMutation({
    mutationFn: async (force = false) => {
      const res = await api.post('/api/system/update/install', { force });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['update-status']);
      toast.success('Update installed successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to install update');
    }
  });

  // Toggle auto-update mutation
  const autoUpdateMutation = useMutation({
    mutationFn: async (enabled) => {
      const res = await api.put('/api/system/update/auto-update', { enabled });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['update-status']);
      toast.success(`Auto-update ${data.autoUpdate ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update setting');
    }
  });

  // Load log content
  const loadLogContent = async (logName) => {
    if (expandedLog === logName) {
      setExpandedLog(null);
      return;
    }

    setLoadingLog(true);
    try {
      const res = await api.get(`/api/system/update/log/${logName}`);
      setLogContent(res.data.content);
      setExpandedLog(logName);
    } catch (error) {
      toast.error('Failed to load log file');
    } finally {
      setLoadingLog(false);
    }
  };

  // Format date from log filename
  const formatLogDate = (dateStr) => {
    // dateStr format: 20240115_143022
    if (!dateStr || dateStr.length < 15) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const hasUpdate = updateStatus?.update_available;

  return (
    <div className="space-y-6">
      {/* Header with Version Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">VHestiaCP Updates</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-semibold">
                <Package className="w-4 h-4" />
                v{VHESTIACP_VERSION}
              </span>
            </div>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Manage VHestiaCP updates and view changelog
            </p>
          </div>
        </div>
        <button
          onClick={() => checkUpdateMutation.mutate()}
          disabled={checkUpdateMutation.isPending}
          className="btn btn-secondary"
        >
          {checkUpdateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Check for Updates
        </button>
      </div>

      {/* Update Status Card */}
      <div className={`card p-6 border-2 ${hasUpdate ? 'border-yellow-400 dark:border-yellow-600' : 'border-green-400 dark:border-green-600'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasUpdate ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
            {hasUpdate ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {hasUpdate ? 'Update Available' : 'Up to Date'}
            </h2>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-dark-muted">Current Version:</span>
                <span className="ml-2 font-mono">{updateStatus?.current_version || 'Unknown'}</span>
                {updateStatus?.current_commit && (
                  <span className="ml-1 text-gray-400">({updateStatus.current_commit})</span>
                )}
              </div>
              {hasUpdate && (
                <div>
                  <span className="text-gray-500 dark:text-dark-muted">Available Version:</span>
                  <span className="ml-2 font-mono text-yellow-600 dark:text-yellow-400">
                    {updateStatus?.remote_version || 'Unknown'}
                  </span>
                  {updateStatus?.remote_commit && (
                    <span className="ml-1 text-gray-400">({updateStatus.remote_commit})</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 dark:text-dark-muted">Branch:</span>
                <span className="ml-1 font-mono">{updateStatus?.branch || 'main'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 dark:text-dark-muted">Last Check:</span>
                <span className="ml-1">
                  {updateStatus?.last_check_date
                    ? new Date(updateStatus.last_check_date).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>

            {hasUpdate && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => installUpdateMutation.mutate(false)}
                  disabled={installUpdateMutation.isPending}
                  className="btn btn-primary"
                >
                  {installUpdateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Install Update ({updateStatus?.commits_behind || 0} commits)
                </button>
                <span className="text-sm text-gray-500">
                  This will pull latest changes from git repository
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Changelog */}
      {hasUpdate && updateStatus?.changelog && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Changelog
          </h3>
          <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{updateStatus.changelog}</pre>
          </div>
        </div>
      )}

      {/* Auto-Update Settings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Auto-Update Settings
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Auto-Update</p>
            <p className="text-sm text-gray-500 dark:text-dark-muted">
              Automatically check and install updates daily at 3:00 AM
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={updateStatus?.autoUpdate || false}
              onChange={(e) => autoUpdateMutation.mutate(e.target.checked)}
              disabled={autoUpdateMutation.isPending}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {updateStatus?.autoUpdate && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              Auto-update is enabled. The system will check for updates daily at 3:00 AM and install them automatically.
              You will be notified via system logs when updates are applied.
            </p>
          </div>
        )}
      </div>

      {/* Update History */}
      {updateStatus?.updateLogs && updateStatus.updateLogs.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Update History
          </h3>
          <div className="space-y-2">
            {updateStatus.updateLogs.map((log) => (
              <div key={log.name} className="border dark:border-dark-border rounded-lg overflow-hidden">
                <button
                  onClick={() => loadLogContent(log.name)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-mono text-sm">{formatLogDate(log.date)}</span>
                  </div>
                  {loadingLog && expandedLog === log.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : expandedLog === log.name ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedLog === log.name && (
                  <div className="border-t dark:border-dark-border bg-gray-50 dark:bg-dark-bg p-4">
                    <pre className="font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {logContent}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GitHub Link */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Source Repository</h3>
            <p className="text-sm text-gray-500 dark:text-dark-muted">
              View source code and contribute to VHestiaCP
            </p>
          </div>
          <a
            href="https://github.com/vietdev99/vhestiacp"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

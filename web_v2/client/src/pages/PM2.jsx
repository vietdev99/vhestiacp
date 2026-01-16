import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Box, RefreshCw, Play, Square, RotateCcw, Trash2,
  Cpu, HardDrive, Clock, AlertTriangle, CheckCircle,
  XCircle, Loader2, FileText, User, ChevronDown, ChevronRight, Shield
} from 'lucide-react';
import clsx from 'clsx';

// Check if process is the webpanel (protected, no actions allowed)
const isWebpanelProcess = (name) => {
  const protectedNames = ['vhestia-panel', 'hestia-web-v2', 'hestia-panel', 'vhestia-web'];
  return protectedNames.includes(name?.toLowerCase());
};

export default function PM2() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [logsModal, setLogsModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);

  // Fetch PM2 processes
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pm2-processes'],
    queryFn: async () => {
      const res = await api.get('/api/pm2');
      return res.data;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Action mutations
  const actionMutation = useMutation({
    mutationFn: async ({ action, id, username }) => {
      if (action === 'delete') {
        await api.delete(`/api/pm2/${id}`, { params: { username } });
      } else {
        await api.post(`/api/pm2/${id}/${action}`, { username });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm2-processes'] });
    }
  });

  // Bulk action mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ action, processes }) => {
      const res = await api.post('/api/pm2/bulk', { action, processes });
      return res.data;
    },
    onSuccess: () => {
      setSelectedProcesses([]);
      queryClient.invalidateQueries({ queryKey: ['pm2-processes'] });
    }
  });

  // Format memory
  const formatMemory = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  // Format uptime
  const formatUptime = (pmUptime) => {
    if (!pmUptime) return '-';
    const diff = (Date.now() - pmUptime) / 1000;
    if (diff > 86400) return `${Math.floor(diff / 86400)}d`;
    if (diff > 3600) return `${Math.floor(diff / 3600)}h`;
    if (diff > 60) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff)}s`;
  };

  // Toggle user expansion
  const toggleUser = (username) => {
    setExpandedUsers(prev => ({ ...prev, [username]: !prev[username] }));
  };

  // Toggle process selection
  const toggleProcess = (processKey) => {
    setSelectedProcesses(prev =>
      prev.includes(processKey)
        ? prev.filter(p => p !== processKey)
        : [...prev, processKey]
    );
  };

  // Select all processes for a user (excluding protected webpanel process)
  const selectAllForUser = (username, processes) => {
    // Filter out protected webpanel processes
    const selectableProcesses = processes.filter(p => !isWebpanelProcess(p.name));
    const userProcessKeys = selectableProcesses.map(p => `${username}:${p.pm_id}`);
    const allSelected = userProcessKeys.length > 0 && userProcessKeys.every(key => selectedProcesses.includes(key));

    if (allSelected) {
      setSelectedProcesses(prev => prev.filter(p => !userProcessKeys.includes(p)));
    } else {
      setSelectedProcesses(prev => [...new Set([...prev, ...userProcessKeys])]);
    }
  };

  // Handle bulk action
  const handleBulkAction = (action) => {
    if (selectedProcesses.length === 0) return;
    if (action === 'delete' && !confirm('Are you sure you want to delete selected processes?')) return;
    bulkMutation.mutate({ action, processes: selectedProcesses });
  };

  // Get processes grouped by user
  const getProcessesByUser = () => {
    if (!data) return {};

    // If admin view with users object
    if (data.users) {
      return data.users;
    }

    // Single user view
    if (data.processes) {
      return { [data.user || user.username]: data.processes };
    }

    return {};
  };

  const processesByUser = getProcessesByUser();
  const totalProcesses = Object.values(processesByUser).reduce((sum, procs) => sum + (procs?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (data?.pm2_installed === false) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Box className="w-7 h-7 text-green-600" />
          PM2 Process Manager
        </h1>

        <div className="card p-6">
          <div className="flex items-start gap-3 text-amber-600">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">PM2 is not installed</h3>
              <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                PM2 is not installed on this system. To install PM2, run:
              </p>
              <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-sm">
                npm install -g pm2
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Box className="w-7 h-7 text-green-600" />
          PM2 Process Manager
          {totalProcesses > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({totalProcesses} processes)
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedProcesses.length > 0 && (
        <div className="card p-4 flex items-center justify-between bg-primary-50 dark:bg-primary-900/20">
          <span className="text-sm font-medium">
            {selectedProcesses.length} process(es) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('restart')}
              className="btn btn-sm btn-secondary"
              disabled={bulkMutation.isPending}
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>
            <button
              onClick={() => handleBulkAction('stop')}
              className="btn btn-sm btn-secondary"
              disabled={bulkMutation.isPending}
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="btn btn-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
              disabled={bulkMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* No processes */}
      {totalProcesses === 0 && (
        <div className="card p-8 text-center">
          <Box className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No PM2 Processes</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isAdmin
              ? 'No PM2 processes are currently running on this system.'
              : 'You have no PM2 processes running.'}
          </p>
        </div>
      )}

      {/* Processes by user */}
      {Object.entries(processesByUser).map(([username, processes]) => {
        if (!processes || processes.length === 0) return null;

        const isExpanded = expandedUsers[username] !== false;
        const userProcessKeys = processes.map(p => `${username}:${p.pm_id}`);
        const allSelected = userProcessKeys.every(key => selectedProcesses.includes(key));

        return (
          <div key={username} className="card overflow-hidden">
            {/* User header */}
            {(isAdmin || Object.keys(processesByUser).length > 1) && (
              <div
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-border cursor-pointer"
                onClick={() => toggleUser(username)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <User className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">{username}</span>
                  <span className="text-sm text-gray-500">
                    ({processes.length} processes)
                  </span>
                </div>
                <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => selectAllForUser(username, processes)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Select all</span>
                </label>
              </div>
            )}

            {/* Processes table */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">CPU</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Memory</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Uptime</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Restarts</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                    {processes.map((proc) => {
                      const pmId = proc.pm_id ?? 0;
                      const name = proc.name || 'unknown';
                      const status = proc.pm2_env?.status || 'unknown';
                      const memory = proc.monit?.memory || 0;
                      const cpu = proc.monit?.cpu || 0;
                      const pmUptime = proc.pm2_env?.pm_uptime || 0;
                      const restarts = proc.pm2_env?.restart_time || 0;
                      const script = proc.pm2_env?.pm_exec_path || '';
                      const processKey = `${username}:${pmId}`;
                      const isSelected = selectedProcesses.includes(processKey);
                      const isOnline = status === 'online';
                      const isProtected = isWebpanelProcess(name);

                      return (
                        <tr
                          key={processKey}
                          className={clsx(
                            'hover:bg-gray-50 dark:hover:bg-dark-border/50',
                            !isOnline && 'opacity-60'
                          )}
                        >
                          <td className="px-4 py-3">
                            {isProtected ? (
                              <Shield className="w-4 h-4 text-blue-500" title="Protected system process" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleProcess(processKey)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{pmId}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isOnline ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {name}
                                  {isProtected && (
                                    <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      System
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {script.split('/').pop()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={clsx(
                              'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                              isOnline
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            )}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-sm">
                            {cpu.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-sm">
                            {formatMemory(memory)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-sm">
                            {formatUptime(pmUptime)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-sm">
                            {restarts}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isProtected ? (
                              <div className="flex items-center justify-end gap-1">
                                {/* Only allow viewing logs for protected processes */}
                                <button
                                  onClick={() => setLogsModal({ username, id: pmId, name })}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-border text-blue-600"
                                  title="View Logs"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-400 ml-2">Protected</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setLogsModal({ username, id: pmId, name })}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-border text-blue-600"
                                  title="View Logs"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => actionMutation.mutate({ action: 'restart', id: pmId, username })}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-border text-green-600"
                                  title="Restart"
                                  disabled={actionMutation.isPending}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                {isOnline ? (
                                  <button
                                    onClick={() => actionMutation.mutate({ action: 'stop', id: pmId, username })}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-border text-orange-600"
                                    title="Stop"
                                    disabled={actionMutation.isPending}
                                  >
                                    <Square className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => actionMutation.mutate({ action: 'start', id: pmId, username })}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-border text-green-600"
                                    title="Start"
                                    disabled={actionMutation.isPending}
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete process "${name}"? This cannot be undone.`)) {
                                      actionMutation.mutate({ action: 'delete', id: pmId, username });
                                    }
                                  }}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-border text-red-600"
                                  title="Delete"
                                  disabled={actionMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Logs Modal */}
      {logsModal && (
        <LogsModal
          username={logsModal.username}
          id={logsModal.id}
          name={logsModal.name}
          onClose={() => setLogsModal(null)}
        />
      )}
    </div>
  );
}

// Logs Modal Component
function LogsModal({ username, id, name, onClose }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pm2-logs', username, id],
    queryFn: async () => {
      const res = await api.get(`/api/pm2/${id}/logs`, {
        params: { username, lines: 200 }
      });
      return res.data;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Logs - {name} (ID: {id})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="btn btn-sm btn-secondary"
              disabled={isLoading}
            >
              <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stdout */}
              {data?.out_logs?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">STDOUT</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60 font-mono">
                    {data.out_logs.join('\n')}
                  </pre>
                </div>
              )}

              {/* Stderr */}
              {data?.err_logs?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">STDERR</h4>
                  <pre className="bg-gray-900 text-red-300 p-4 rounded-lg text-xs overflow-auto max-h-60 font-mono">
                    {data.err_logs.join('\n')}
                  </pre>
                </div>
              )}

              {(!data?.out_logs?.length && !data?.err_logs?.length) && (
                <div className="text-center py-8 text-gray-500">
                  No logs available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

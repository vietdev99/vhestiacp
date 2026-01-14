import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, History, RefreshCw, Download, Calendar, Clock, Activity } from 'lucide-react';

export default function UserLogs() {
  const { username } = useParams();
  const [logType, setLogType] = useState('history');

  // Fetch logs
  const { data: logs, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['user-logs', username, logType],
    queryFn: async () => {
      const res = await api.get(`/api/users/${username}/logs`, {
        params: { type: logType }
      });
      return res.data.logs;
    }
  });

  const handleDownload = () => {
    const content = Array.isArray(logs)
      ? logs.map(l => `${l.DATE} ${l.TIME} [${l.CATEGORY}] ${l.MESSAGE}`).join('\n')
      : logs || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}-${logType}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get level/category badge color
  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'warning': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'info': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Get category icon color
  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'web': return 'text-green-500';
      case 'mail': return 'text-blue-500';
      case 'dns': return 'text-purple-500';
      case 'database': return 'text-orange-500';
      case 'security': return 'text-red-500';
      case 'backup': return 'text-cyan-500';
      case 'system': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to={`/users/${username}/edit`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">User Logs</h1>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Activity history for {username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleDownload}
            disabled={!logs || logs.length === 0}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Log Type:</label>
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value)}
            className="input w-auto"
          >
            <option value="history">Action History</option>
            <option value="login">Login History</option>
          </select>
        </div>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-dark-border">
          <History className="w-5 h-5 text-purple-500" />
          <span className="font-medium">
            {logType === 'history' ? 'Action History' : 'Login History'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            Failed to load logs. {error.response?.data?.error || ''}
          </div>
        ) : Array.isArray(logs) && logs.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {logs.map((log, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-border/50">
                <div className="flex items-start gap-4">
                  <Activity className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getCategoryColor(log.CATEGORY)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(log.LEVEL)}`}>
                        {log.LEVEL}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-dark-muted">
                        {log.CATEGORY}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {log.MESSAGE}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-dark-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {log.DATE}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.TIME}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No log entries found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

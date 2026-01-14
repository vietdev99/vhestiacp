import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, FileText, AlertTriangle, RefreshCw, Download } from 'lucide-react';

export default function WebLogs() {
  const { domain } = useParams();
  const [logType, setLogType] = useState('access');
  const [lines, setLines] = useState(100);

  // Fetch logs
  const { data: logs, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['web-logs', domain, logType, lines],
    queryFn: async () => {
      const res = await api.get(`/api/web/${domain}/logs`, {
        params: { type: logType, lines }
      });
      return res.data.logs;
    }
  });

  const handleDownload = () => {
    const blob = new Blob([logs || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-${logType}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/web"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Web Logs</h1>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              View logs for {domain}
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
            disabled={!logs}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Log Type:</label>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="input w-auto"
            >
              <option value="access">Access Log</option>
              <option value="error">Error Log</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Lines:</label>
            <select
              value={lines}
              onChange={(e) => setLines(parseInt(e.target.value))}
              className="input w-auto"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-dark-border">
          {logType === 'access' ? (
            <FileText className="w-5 h-5 text-blue-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          )}
          <span className="font-medium">
            {logType === 'access' ? 'Access Log' : 'Error Log'}
          </span>
        </div>

        <div className="p-4 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load logs. {error.response?.data?.error || ''}
            </div>
          ) : logs ? (
            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
              {logs}
            </pre>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              No log entries found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

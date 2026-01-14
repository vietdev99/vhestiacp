import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { HardDrive, Download, Trash2, RefreshCw, Archive, Calendar, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Backups() {
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
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Backups</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage your account backups
          </p>
        </div>
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

      {/* Backups list */}
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

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {data.length} {data.length === 1 ? 'backup' : 'backups'}
      </div>
    </div>
  );
}

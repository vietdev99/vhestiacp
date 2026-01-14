import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Ban,
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FirewallBanlist() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBan, setNewBan] = useState({ ip: '', chain: 'SSH' });

  // Fetch banned IPs
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['firewall-banlist'],
    queryFn: async () => {
      const res = await api.get('/api/firewall/banlist');
      return res.data;
    }
  });

  // Add ban mutation
  const addBanMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/firewall/ban', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['firewall-banlist']);
      toast.success('IP banned successfully');
      setShowAddModal(false);
      setNewBan({ ip: '', chain: 'SSH' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to ban IP');
    }
  });

  // Delete ban mutation
  const deleteBanMutation = useMutation({
    mutationFn: async ({ ip, chain }) => {
      await api.delete(`/api/firewall/ban/${encodeURIComponent(ip)}/${encodeURIComponent(chain)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['firewall-banlist']);
      toast.success('IP unbanned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to unban IP');
    }
  });

  const bans = data?.bans || [];

  // Common chains for fail2ban
  const chains = ['SSH', 'WEB', 'MAIL', 'FTP', 'DNS', 'HESTIA'];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/firewall"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ban className="w-7 h-7 text-red-500" />
            Banned IP Addresses
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            IPs blocked by Fail2Ban
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ban IP
        </button>
      </div>

      {/* Info */}
      <div className="card p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700 dark:text-yellow-400">
            <p>
              These IPs are blocked by Fail2Ban chains. Unbanning an IP will allow it to connect again.
              Bans may be re-applied automatically if the IP continues suspicious activity.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">
            Failed to load banned IPs
          </h3>
          <p className="text-gray-500 dark:text-dark-muted">
            {error.response?.data?.error || 'An error occurred'}
          </p>
        </div>
      ) : bans.length === 0 ? (
        <div className="card p-12 text-center">
          <Ban className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">
            No banned IPs
          </h3>
          <p className="text-gray-500 dark:text-dark-muted">
            No IP addresses are currently banned by Fail2Ban.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Chain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Banned Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {bans.map((ban, index) => (
                <tr key={`${ban.ip}-${ban.chain}-${index}`} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-900 dark:text-dark-text">
                      {ban.ip}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                      {ban.chain}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-dark-muted">
                    {ban.date} {ban.time}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to unban ${ban.ip}?`)) {
                          deleteBanMutation.mutate({ ip: ban.ip, chain: ban.chain });
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Unban
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 dark:bg-dark-border border-t border-gray-200 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-muted">
              {bans.length} banned IP{bans.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Add Ban Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-semibold">Ban IP Address</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBan.ip) {
                  toast.error('IP address is required');
                  return;
                }
                addBanMutation.mutate(newBan);
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  IP Address *
                </label>
                <input
                  type="text"
                  value={newBan.ip}
                  onChange={(e) => setNewBan((prev) => ({ ...prev, ip: e.target.value }))}
                  placeholder="e.g., 192.168.1.100"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  Chain *
                </label>
                <select
                  value={newBan.chain}
                  onChange={(e) => setNewBan((prev) => ({ ...prev, chain: e.target.value }))}
                  className="input w-full"
                >
                  {chains.map((chain) => (
                    <option key={chain} value={chain}>
                      {chain}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-muted">
                  Select the service/chain to block this IP from
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBanMutation.isPending}
                  className="btn btn-primary bg-red-600 hover:bg-red-700"
                >
                  {addBanMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Ban className="w-4 h-4 mr-2" />
                  )}
                  Ban IP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

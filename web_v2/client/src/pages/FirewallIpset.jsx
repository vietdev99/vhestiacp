import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  List,
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FirewallIpset() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIpset, setNewIpset] = useState({ name: '', ip: '' });

  // Fetch ipset lists
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['firewall-ipset'],
    queryFn: async () => {
      const res = await api.get('/api/firewall/ipset');
      return res.data;
    }
  });

  // Add ipset entry mutation
  const addIpsetMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/firewall/ipset', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['firewall-ipset']);
      toast.success('IP added to ipset successfully');
      setShowAddModal(false);
      setNewIpset({ name: '', ip: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add IP to ipset');
    }
  });

  // Delete ipset entry mutation
  const deleteIpsetMutation = useMutation({
    mutationFn: async ({ name, ip }) => {
      await api.delete(`/api/firewall/ipset/${encodeURIComponent(name)}/${encodeURIComponent(ip)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['firewall-ipset']);
      toast.success('IP removed from ipset');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to remove IP from ipset');
    }
  });

  const handleAddIpset = (e) => {
    e.preventDefault();
    if (!newIpset.name || !newIpset.ip) {
      toast.error('Please fill all fields');
      return;
    }
    addIpsetMutation.mutate(newIpset);
  };

  const handleDelete = (name, ip) => {
    if (window.confirm(`Remove IP ${ip} from ipset ${name}?`)) {
      deleteIpsetMutation.mutate({ name, ip });
    }
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
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-red-500">Failed to load ipset lists. {error.response?.data?.error || ''}</p>
        <button onClick={() => refetch()} className="mt-4 btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const ipsets = data?.ipsets || [];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/firewall" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <List className="w-7 h-7" />
              IPset Lists
            </h1>
          </div>
          <p className="text-gray-500 dark:text-dark-muted mt-1 ml-7">
            Manage IP address sets for firewall rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add IP to Set
          </button>
        </div>
      </div>

      {/* IPset Lists */}
      {ipsets.length === 0 ? (
        <div className="card p-12 text-center">
          <List className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">No ipset lists found</h3>
          <p className="text-gray-500 dark:text-dark-muted mb-4">
            IPset lists allow you to group IP addresses for firewall rules.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {ipsets.map((ipset) => (
            <div key={ipset.name} className="card overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-dark-border border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{ipset.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
                      {ipset.entries?.length || 0} entries
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-dark-card">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                    {ipset.entries?.length > 0 ? (
                      ipset.entries.map((ip, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                            {ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDelete(ipset.name, ip)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="px-6 py-8 text-center text-gray-500 dark:text-dark-muted">
                          No entries in this ipset
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-xl font-semibold">Add IP to IPset</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddIpset} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">IPset Name</label>
                  <input
                    type="text"
                    value={newIpset.name}
                    onChange={(e) => setNewIpset({ ...newIpset, name: e.target.value })}
                    className="input"
                    placeholder="e.g., blacklist, whitelist"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">IP Address</label>
                  <input
                    type="text"
                    value={newIpset.ip}
                    onChange={(e) => setNewIpset({ ...newIpset, ip: e.target.value })}
                    className="input"
                    placeholder="e.g., 192.168.1.100 or 10.0.0.0/24"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addIpsetMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {addIpsetMutation.isPending ? 'Adding...' : 'Add IP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

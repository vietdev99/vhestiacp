import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Search, PlusCircle, Edit, List, Pause, Play, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DNS() {
  const [search, setSearch] = useState('');
  const [selectedZones, setSelectedZones] = useState([]);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dns-domains'],
    queryFn: async () => {
      const res = await api.get('/api/dns');
      return res.data.zones || [];
    }
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ domain, suspend }) => {
      if (suspend) {
        await api.post(`/api/dns/${domain}/suspend`);
      } else {
        await api.post(`/api/dns/${domain}/unsuspend`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dns-domains']);
      toast.success('DNS zone updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update DNS zone');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (domain) => {
      await api.delete(`/api/dns/${domain}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dns-domains']);
      toast.success('DNS zone deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete DNS zone');
    }
  });

  const handleDelete = (domain) => {
    if (confirm(`Are you sure you want to delete DNS zone "${domain}"?`)) {
      deleteMutation.mutate(domain);
    }
  };

  const handleSuspend = (domain, currentlySuspended) => {
    suspendMutation.mutate({ domain, suspend: !currentlySuspended });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedZones(filteredDomains.map(d => d.domain));
    } else {
      setSelectedZones([]);
    }
  };

  const handleSelectZone = (domain, checked) => {
    if (checked) {
      setSelectedZones([...selectedZones, domain]);
    } else {
      setSelectedZones(selectedZones.filter(d => d !== domain));
    }
  };

  const filteredDomains = data?.filter(d =>
    d.domain?.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
        Failed to load DNS domains. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">DNS Zones</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage your DNS zones and records
          </p>
        </div>
        <Link to="/dns/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add DNS Zone
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search DNS zones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* DNS table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedZones.length === filteredDomains.length && filteredDomains.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Records
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Template
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  TTL
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  SOA
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  DNSSEC
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Expiration Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredDomains.map((item) => {
                const isSuspended = item.SUSPENDED === 'yes';
                return (
                  <tr key={item.domain} className={`hover:bg-gray-50 dark:hover:bg-dark-border/50 ${isSuspended ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedZones.includes(item.domain)}
                        onChange={(e) => handleSelectZone(item.domain, e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/dns/${item.domain}`} className="text-primary-600 hover:text-primary-700 font-medium">
                          {item.domain}
                        </Link>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 ml-2">
                          <Link
                            to={`/dns/${item.domain}/add-record`}
                            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                            title="Add Record"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/dns/${item.domain}/edit`}
                            className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/dns/${item.domain}`}
                            className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500"
                            title="List Records"
                          >
                            <List className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleSuspend(item.domain, isSuspended)}
                            className={`p-1.5 rounded ${isSuspended ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600' : 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600'}`}
                            title={isSuspended ? 'Unsuspend' : 'Suspend'}
                          >
                            {isSuspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(item.domain)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.RECORDS || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.TPL || 'default'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.TTL || '14400'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-primary-600">
                      {item.SOA || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.DNSSEC === 'yes' ? (
                        <span className="text-green-500">●</span>
                      ) : (
                        <span className="text-red-500">●</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.EXP || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDomains.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? 'No DNS zones found matching your search.' : 'No DNS zones yet. Add your first zone to get started.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {filteredDomains.length} {filteredDomains.length === 1 ? 'zone' : 'zones'}
      </div>
    </div>
  );
}

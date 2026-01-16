import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Search, Mail as MailIcon, Trash2 } from 'lucide-react';

export default function Mail() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mail-domains'],
    queryFn: async () => {
      const res = await api.get('/api/mail');
      return Array.isArray(res.data) ? res.data : (res.data.domains || []);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (domain) => {
      await api.delete(`/api/mail/${domain}`);
    },
    onSuccess: () => {
      refetch();
    }
  });

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
        Failed to load mail domains. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mail Domains</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage your mail domains and accounts
          </p>
        </div>
        <Link to="/mail/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Mail Domain
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search mail domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Mail table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Accounts
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Disk
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredDomains.map((item) => (
                <tr key={item.domain} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-4 cursor-pointer" onClick={() => navigate(`/mail/${item.domain}`)}>
                    <div className="flex items-center gap-2">
                      <MailIcon className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-primary-600 hover:underline">{item.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-dark-muted">
                    {item.ACCOUNTS || 0}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-dark-muted">
                    {item.U_DISK || 0} MB
                  </td>
                  <td className="px-4 py-4 text-center">
                    {item.SUSPENDED === 'yes' ? (
                      <span className="badge badge-danger">Suspended</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete mail domain "${item.domain}"? This will also delete all mail accounts.`)) {
                          deleteMutation.mutate(item.domain);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                      title="Delete domain"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDomains.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? 'No mail domains found matching your search.' : 'No mail domains yet. Add your first domain to get started.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {filteredDomains.length} {filteredDomains.length === 1 ? 'domain' : 'domains'}
      </div>
    </div>
  );
}

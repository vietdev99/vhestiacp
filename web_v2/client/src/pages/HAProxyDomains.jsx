import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import {
  Network,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Server,
  Lock,
  Unlock,
  Power,
  PowerOff,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HAProxyDomains() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch HAProxy domains
  const { data, isLoading, error } = useQuery({
    queryKey: ['haproxy-domains'],
    queryFn: async () => {
      const res = await api.get('/api/haproxy/domains');
      return res.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (domain) => {
      await api.delete(`/api/haproxy/domains/${encodeURIComponent(domain)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['haproxy-domains']);
      toast.success('Domain removed from HAProxy');
      setDeleteConfirm(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete domain');
    }
  });

  // Toggle enabled mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ domain, enabled, config }) => {
      await api.put(`/api/haproxy/domains/${encodeURIComponent(domain)}`, {
        ...config,
        enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['haproxy-domains']);
      toast.success('Domain status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update domain');
    }
  });

  const handleMenuClick = (e, domain) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      right: window.innerWidth - rect.right
    });
    setOpenMenu(openMenu === domain ? null : domain);
  };

  const domains = data?.domains || [];
  const filteredDomains = domains.filter(d =>
    d.domain.toLowerCase().includes(search.toLowerCase()) ||
    d.backend?.host?.toLowerCase().includes(search.toLowerCase())
  );

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
        Failed to load HAProxy domains. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Network className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">HAProxy Domains</h1>
            <p className="text-gray-500 dark:text-dark-muted text-sm">
              Manage your domain routing through HAProxy
            </p>
          </div>
        </div>

        <Link to="/haproxy/domains/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Domains List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Backend
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  SSL
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
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{item.domain}</div>
                        {item.aliases && item.aliases.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-dark-muted">
                            + {item.aliases.join(', ')}
                          </div>
                        )}
                      </div>
                      <a
                        href={`https://${item.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {item.routingMode === 'advanced' || (item.aclRules && item.aclRules.length > 0) ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Multiple (ACL)
                          </span>
                        ) : item.defaultBackend === '__system__' ? (
                          <span className="text-green-600 dark:text-green-400">
                            System Web Server
                          </span>
                        ) : item.backend?.host && item.backend?.port ? (
                          `${item.backend.host}:${item.backend.port}`
                        ) : item.backends && item.backends.length > 0 ? (
                          item.backends[0].name
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`badge ${item.routingMode === 'advanced' ? 'badge-purple' : 'badge-info'}`}>
                      {item.routingMode === 'advanced' || (item.aclRules && item.aclRules.length > 0)
                        ? 'ACL'
                        : item.backend?.type || (item.backends?.length > 0 ? 'pool' : 'custom')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {item.ssl?.mode === 'termination' ? (
                      <span className="flex items-center justify-center gap-1 text-green-600">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs">Termination</span>
                      </span>
                    ) : item.ssl?.mode === 'passthrough' ? (
                      <span className="flex items-center justify-center gap-1 text-blue-600">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs">Passthrough</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-gray-400">
                        <Unlock className="w-4 h-4" />
                        <span className="text-xs">None</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {item.enabled ? (
                      <span className="badge badge-success">Enabled</span>
                    ) : (
                      <span className="badge badge-danger">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={(e) => handleMenuClick(e, item.domain)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDomains.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? (
                'No domains found matching your search.'
              ) : (
                <div>
                  <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No HAProxy domains configured yet.</p>
                  <Link to="/haproxy/domains/add" className="btn btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Domain
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {domains.length} {domains.length === 1 ? 'domain' : 'domains'} configured
        {domains.filter(d => d.enabled).length < domains.length && (
          <span className="ml-2">
            ({domains.filter(d => d.enabled).length} enabled)
          </span>
        )}
      </div>

      {/* Context Menu */}
      {openMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenMenu(null)}
          />
          <div
            className="fixed w-52 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-xl z-50 py-1"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <Link
              to={`/haproxy/domains/${encodeURIComponent(openMenu)}/edit`}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-border"
              onClick={() => setOpenMenu(null)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            {(() => {
              const domain = domains.find(d => d.domain === openMenu);
              return domain && (
                <button
                  onClick={() => {
                    toggleMutation.mutate({
                      domain: openMenu,
                      enabled: !domain.enabled,
                      config: {
                        backendHost: domain.backend?.host,
                        backendPort: domain.backend?.port,
                        backendType: domain.backend?.type,
                        sslMode: domain.ssl?.mode,
                        aliases: domain.aliases?.join(' ') || '',
                        healthCheck: domain.options?.healthCheck
                      }
                    });
                    setOpenMenu(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-border"
                >
                  {domain.enabled ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Enable
                    </>
                  )}
                </button>
              );
            })()}
            <hr className="my-1 border-gray-200 dark:border-dark-border" />
            <button
              onClick={() => {
                setDeleteConfirm(openMenu);
                setOpenMenu(null);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">Delete HAProxy Domain</h3>
            <p className="text-gray-600 dark:text-dark-muted mb-4">
              Are you sure you want to remove <strong>{deleteConfirm}</strong> from HAProxy?
              This will stop routing traffic through HAProxy for this domain.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="btn btn-danger"
              >
                {deleteMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

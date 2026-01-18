import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Pause,
  Play,
  MoreVertical,
  ExternalLink,
  Lock,
  Unlock,
  BarChart3,
  Download,
  Eye,
  HardDrive,
  Activity,
  Shield,
  ShieldCheck,
  ShieldX,
  Copy,
  Check,
  FolderOpen
} from 'lucide-react';

export default function Web() {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [copiedPath, setCopiedPath] = useState(null);
  const buttonRefs = useRef({});
  const queryClient = useQueryClient();

  // Copy path to clipboard
  const handleCopyPath = async (path, domain) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(domain);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Fetch web domains
  const { data, isLoading, error } = useQuery({
    queryKey: ['web-domains'],
    queryFn: async () => {
      const res = await api.get('/api/web');
      return res.data.domains;
    }
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ domain, suspend }) => {
      if (suspend) {
        await api.post(`/api/web/${domain}/suspend`);
      } else {
        await api.post(`/api/web/${domain}/unsuspend`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web-domains']);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (domain) => {
      await api.delete(`/api/web/${domain}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web-domains']);
    }
  });

  // SSL mutation
  const sslMutation = useMutation({
    mutationFn: async ({ domain, enable }) => {
      if (enable) {
        await api.post(`/api/web/${domain}/ssl`, { letsencrypt: true });
      } else {
        await api.delete(`/api/web/${domain}/ssl`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web-domains']);
    }
  });

  const handleOpenMenu = (domain) => {
    if (openMenu === domain) {
      setOpenMenu(null);
      return;
    }

    const button = buttonRefs.current[domain];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setOpenMenu(domain);
  };

  const handleDelete = (domain) => {
    if (confirm(`Are you sure you want to delete domain "${domain}"? This cannot be undone.`)) {
      deleteMutation.mutate(domain);
    }
    setOpenMenu(null);
  };

  const handleSuspend = (domain, currentlySuspended) => {
    suspendMutation.mutate({ domain, suspend: !currentlySuspended });
    setOpenMenu(null);
  };

  const handleToggleSSL = (domain, currentlyEnabled) => {
    sslMutation.mutate({ domain, enable: !currentlyEnabled });
    setOpenMenu(null);
  };

  // Filter domains by search
  const filteredDomains = data?.filter(d =>
    d.domain.toLowerCase().includes(search.toLowerCase()) ||
    d.ALIAS?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Format size helper
  const formatSize = (mb) => {
    if (!mb || mb === '0') return '0 MB';
    const num = parseFloat(mb);
    if (num >= 1024) return `${(num / 1024).toFixed(1)} GB`;
    return `${num} MB`;
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
        Failed to load web domains. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Web Domains</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage your websites and domains
          </p>
        </div>
        <Link to="/web/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Web Domain
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Domains table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Disk
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Bandwidth
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
              {filteredDomains.map((item) => {
                const aliases = item.ALIAS?.split(',').filter(a => a && a !== `www.${item.domain}`) || [];
                const isSuspended = item.SUSPENDED === 'yes';
                const hasSSL = item.SSL === 'yes';

                return (
                  <tr
                    key={item.domain}
                    className={`hover:bg-gray-50 dark:hover:bg-dark-border/50 ${isSuspended ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <a
                          href={`http${hasSSL ? 's' : ''}://${item.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          {item.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {aliases.length > 0 && (
                          <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 truncate max-w-xs">
                            {aliases.slice(0, 2).join(', ')}
                            {aliases.length > 2 && ` +${aliases.length - 2} more`}
                          </p>
                        )}
                        {item.DOCUMENT_ROOT && (
                          <div className="flex items-center gap-1 mt-1.5 group">
                            <FolderOpen className="w-3 h-3 text-gray-400" />
                            <code className="text-xs text-gray-500 dark:text-dark-muted font-mono bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded max-w-xs truncate">
                              {item.DOCUMENT_ROOT}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPath(item.DOCUMENT_ROOT, item.domain);
                              }}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-border opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy path"
                            >
                              {copiedPath === item.domain ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-dark-muted">
                      {item.IP}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-dark-muted">
                        <HardDrive className="w-4 h-4" />
                        {formatSize(item.U_DISK)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-dark-muted">
                        <Activity className="w-4 h-4" />
                        {formatSize(item.U_BANDWIDTH)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {hasSSL ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400" title="SSL Enabled">
                          <ShieldCheck className="w-5 h-5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400" title="SSL Disabled">
                          <ShieldX className="w-5 h-5" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isSuspended ? (
                        <span className="badge badge-danger">Suspended</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        ref={(el) => buttonRefs.current[item.domain] = el}
                        onClick={() => handleOpenMenu(item.domain)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDomains.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? 'No domains found matching your search.' : 'No web domains yet. Add your first domain to get started.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {filteredDomains.length} {filteredDomains.length === 1 ? 'domain' : 'domains'}
      </div>

      {/* Dropdown Menu Portal */}
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
            {(() => {
              const item = filteredDomains.find(d => d.domain === openMenu);
              if (!item) return null;

              const isSuspended = item.SUSPENDED === 'yes';
              const hasSSL = item.SSL === 'yes';

              return (
                <>
                  <a
                    href={`http${hasSSL ? 's' : ''}://${openMenu}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                    onClick={() => setOpenMenu(null)}
                  >
                    <ExternalLink className="w-4 h-4 text-blue-500" />
                    Visit Site
                  </a>
                  {!isSuspended && (
                    <>
                      <Link
                        to={`/web/${openMenu}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                        onClick={() => setOpenMenu(null)}
                      >
                        <Edit className="w-4 h-4 text-orange-500" />
                        Edit Domain
                      </Link>
                      <button
                        onClick={() => handleToggleSSL(openMenu, hasSSL)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                      >
                        {hasSSL ? (
                          <>
                            <Unlock className="w-4 h-4 text-gray-500" />
                            Disable SSL
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-green-500" />
                            Enable SSL
                          </>
                        )}
                      </button>
                      {item.STATS && item.STATS !== 'no' && (
                        <a
                          href={`http://${openMenu}/vstats/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                          onClick={() => setOpenMenu(null)}
                        >
                          <BarChart3 className="w-4 h-4 text-purple-500" />
                          View Statistics
                        </a>
                      )}
                      <Link
                        to={`/web/${openMenu}/logs`}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                        onClick={() => setOpenMenu(null)}
                      >
                        <Eye className="w-4 h-4 text-purple-500" />
                        View Logs
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => handleSuspend(openMenu, isSuspended)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                  >
                    {isSuspended ? (
                      <>
                        <Play className="w-4 h-4 text-green-500" />
                        Unsuspend
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 text-orange-500" />
                        Suspend
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(openMenu)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              );
            })()}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

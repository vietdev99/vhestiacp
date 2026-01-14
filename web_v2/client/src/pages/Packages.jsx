import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Globe,
  Database,
  Mail,
  HardDrive,
  Clock,
  Server,
  MoreVertical,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Packages() {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  // Fetch packages
  const { data: packages, isLoading, error } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const res = await api.get('/api/packages');
      return res.data.packages;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (name) => {
      await api.delete(`/api/packages/${name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['packages']);
      toast.success('Package deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete package');
    }
  });

  const handleDelete = (name) => {
    if (deleteConfirm === name) {
      deleteMutation.mutate(name);
    } else {
      setDeleteConfirm(name);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // Format value for display
  const formatValue = (value) => {
    if (value === 'unlimited' || value === '0') return 'Unlimited';
    return value;
  };

  // Format disk/bandwidth
  const formatSize = (value) => {
    if (value === 'unlimited' || value === '0') return 'Unlimited';
    const num = parseInt(value);
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
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load packages. {error.response?.data?.error || ''}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Packages</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage hosting packages and resource limits
          </p>
        </div>
        <Link to="/packages/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Link>
      </div>

      {/* Packages Grid */}
      {packages && packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="card p-4 hover:shadow-md transition-shadow"
            >
              {/* Package Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{pkg.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-dark-muted">
                      {pkg.SHELL === 'nologin' ? 'No Shell Access' : pkg.SHELL}
                    </p>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === pkg.name ? null : pkg.name)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenu === pkg.name && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenu(null)}
                      />
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border z-20">
                        <Link
                          to={`/packages/${pkg.name}/edit`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                        <Link
                          to={`/packages/add?copy=${pkg.name}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </Link>
                        {pkg.name !== 'default' && pkg.name !== 'system' && (
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              handleDelete(pkg.name);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deleteConfirm === pkg.name ? 'Confirm?' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Resource Limits */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-dark-border">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Globe className="w-4 h-4" />
                    Web Domains
                  </span>
                  <span className="font-medium">{formatValue(pkg.WEB_DOMAINS)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-dark-border">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Server className="w-4 h-4" />
                    DNS Domains
                  </span>
                  <span className="font-medium">{formatValue(pkg.DNS_DOMAINS)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-dark-border">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Mail className="w-4 h-4" />
                    Mail Domains
                  </span>
                  <span className="font-medium">{formatValue(pkg.MAIL_DOMAINS)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-dark-border">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Database className="w-4 h-4" />
                    Databases
                  </span>
                  <span className="font-medium">{formatValue(pkg.DATABASES)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-dark-border">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <Clock className="w-4 h-4" />
                    Cron Jobs
                  </span>
                  <span className="font-medium">{formatValue(pkg.CRON_JOBS)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-dark-border">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <HardDrive className="w-4 h-4" />
                    Disk Quota
                  </span>
                  <span className="font-medium">{formatSize(pkg.DISK_QUOTA)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-dark-muted">
                    <HardDrive className="w-4 h-4" />
                    Bandwidth
                  </span>
                  <span className="font-medium">{formatSize(pkg.BANDWIDTH)}</span>
                </div>
              </div>

              {/* Templates & Backups */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-dark-border rounded">
                    Web: {pkg.WEB_TEMPLATE || 'default'}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-dark-border rounded">
                    Backups: {pkg.BACKUPS}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No packages found</h3>
          <p className="text-gray-500 dark:text-dark-muted mb-4">
            Create your first hosting package to get started.
          </p>
          <Link to="/packages/add" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Link>
        </div>
      )}
    </div>
  );
}

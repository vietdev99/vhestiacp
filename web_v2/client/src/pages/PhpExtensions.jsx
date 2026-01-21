import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Package,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  Star,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PhpExtensions() {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);
  const [installingExt, setInstallingExt] = useState(null);
  const [removingExt, setRemovingExt] = useState(null);

  // Fetch PHP versions
  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['php-versions'],
    queryFn: async () => {
      const res = await api.get('/api/php/versions');
      return res.data;
    },
    onSuccess: (data) => {
      // Set default version if not selected
      if (!selectedVersion && data.defaultVersion) {
        setSelectedVersion(data.defaultVersion);
      } else if (!selectedVersion && data.versions?.length > 0) {
        setSelectedVersion(data.versions[data.versions.length - 1]); // Latest version
      }
    }
  });

  // Set default version when data loads
  if (versionsData && !selectedVersion) {
    if (versionsData.defaultVersion) {
      setSelectedVersion(versionsData.defaultVersion);
    } else if (versionsData.versions?.length > 0) {
      setSelectedVersion(versionsData.versions[versionsData.versions.length - 1]);
    }
  }

  // Fetch extensions for selected version
  const { data: extensionsData, isLoading: loadingExtensions, refetch } = useQuery({
    queryKey: ['php-extensions', selectedVersion],
    queryFn: async () => {
      const res = await api.get(`/api/php/extensions/${selectedVersion}`);
      return res.data;
    },
    enabled: !!selectedVersion
  });

  // Install extension mutation
  const installMutation = useMutation({
    mutationFn: async (extension) => {
      setInstallingExt(extension);
      await api.post(`/api/php/extensions/${selectedVersion}/install`, { extension });
    },
    onSuccess: (_, extension) => {
      queryClient.invalidateQueries(['php-extensions', selectedVersion]);
      toast.success(`Extension ${extension} installed successfully`);
      setInstallingExt(null);
    },
    onError: (error, extension) => {
      toast.error(error.response?.data?.error || `Failed to install ${extension}`);
      setInstallingExt(null);
    }
  });

  // Remove extension mutation
  const removeMutation = useMutation({
    mutationFn: async (extension) => {
      setRemovingExt(extension);
      await api.delete(`/api/php/extensions/${selectedVersion}/${extension}`);
    },
    onSuccess: (_, extension) => {
      queryClient.invalidateQueries(['php-extensions', selectedVersion]);
      toast.success(`Extension ${extension} removed successfully`);
      setRemovingExt(null);
    },
    onError: (error, extension) => {
      toast.error(error.response?.data?.error || `Failed to remove ${extension}`);
      setRemovingExt(null);
    }
  });

  // Filter extensions
  const filteredExtensions = extensionsData?.extensions?.filter(ext => {
    // Search filter
    if (searchTerm && !ext.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !ext.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Installed filter
    if (showOnlyInstalled && !ext.installed) {
      return false;
    }
    // Popular filter
    if (showOnlyPopular && !ext.popular) {
      return false;
    }
    return true;
  }) || [];

  // Sort: installed first, then popular, then alphabetically
  const sortedExtensions = [...filteredExtensions].sort((a, b) => {
    // Installed first
    if (a.installed !== b.installed) {
      return a.installed ? -1 : 1;
    }
    // Then popular
    if (a.popular !== b.popular) {
      return a.popular ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });

  // Count installed
  const installedCount = extensionsData?.extensions?.filter(e => e.installed).length || 0;
  const totalCount = extensionsData?.extensions?.length || 0;

  if (loadingVersions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!versionsData?.versions?.length) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-dark-muted mb-4" />
          <h2 className="text-xl font-semibold mb-2">No PHP-FPM Installed</h2>
          <p className="text-gray-500 dark:text-dark-muted">
            Please install PHP-FPM from the Applications page first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">PHP Extensions</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage PHP extensions for each PHP version
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loadingExtensions}
          className="btn btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingExtensions ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Version Selector */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="font-medium">PHP Version:</label>
          <div className="flex flex-wrap gap-2">
            {versionsData.versions.map((version) => (
              <button
                key={version}
                onClick={() => setSelectedVersion(version)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedVersion === version
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-hover'
                }`}
              >
                PHP {version}
                {version === versionsData.defaultVersion && (
                  <span className="ml-2 text-xs opacity-75">(default)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedVersion && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search extensions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOnlyInstalled(!showOnlyInstalled)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    showOnlyInstalled
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-hover'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Installed ({installedCount})
                </button>
                <button
                  onClick={() => setShowOnlyPopular(!showOnlyPopular)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    showOnlyPopular
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-hover'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Popular
                </button>
              </div>

              {/* Stats */}
              <div className="text-sm text-gray-500 dark:text-dark-muted">
                {installedCount} / {totalCount} installed
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extensions Grid */}
      {loadingExtensions ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedExtensions.map((ext) => (
            <div
              key={ext.name}
              className={`card p-4 hover:shadow-md transition-shadow ${
                ext.installed ? 'border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ext.installed
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-dark-border dark:text-gray-400'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{ext.name}</h3>
                      {ext.popular && (
                        <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-muted truncate" title={ext.description}>
                      {ext.description || ext.package}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ext.installed ? (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Installed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      Not Installed
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-dark-muted font-mono">
                  {ext.package}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                {ext.installed ? (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove ${ext.name}? This will restart PHP-FPM.`)) {
                        removeMutation.mutate(ext.name);
                      }
                    }}
                    disabled={removingExt === ext.name}
                    className="w-full btn btn-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                  >
                    {removingExt === ext.name ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => installMutation.mutate(ext.name)}
                    disabled={installingExt === ext.name}
                    className="w-full btn btn-sm btn-primary"
                  >
                    {installingExt === ext.name ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}

          {sortedExtensions.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-dark-muted mb-4" />
              <p className="text-gray-500 dark:text-dark-muted">
                {searchTerm || showOnlyInstalled || showOnlyPopular
                  ? 'No extensions match your filters'
                  : 'No extensions available'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

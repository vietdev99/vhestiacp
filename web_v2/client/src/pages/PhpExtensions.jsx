import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
  Filter,
  Square,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PhpExtensions() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);
  const [selectedExtensions, setSelectedExtensions] = useState(new Set());
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState({ current: 0, total: 0, name: '' });
  const [removingExt, setRemovingExt] = useState(null);

  // Get selected version from URL params
  const selectedVersion = searchParams.get('version');

  // Fetch PHP versions
  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['php-versions'],
    queryFn: async () => {
      const res = await api.get('/api/php/versions');
      return res.data;
    }
  });

  // Set default version when data loads (only if no version in URL)
  useEffect(() => {
    if (versionsData && !selectedVersion) {
      let defaultVer = versionsData.defaultVersion;
      if (!defaultVer && versionsData.versions?.length > 0) {
        defaultVer = versionsData.versions[versionsData.versions.length - 1];
      }
      if (defaultVer) {
        setSearchParams({ version: defaultVer }, { replace: true });
      }
    }
  }, [versionsData, selectedVersion, setSearchParams]);

  // Function to change selected version
  const changeVersion = (version) => {
    setSearchParams({ version }, { replace: true });
  };

  // Clear selection when version changes
  useEffect(() => {
    setSelectedExtensions(new Set());
  }, [selectedVersion]);

  // Fetch extensions for selected version
  const { data: extensionsData, isLoading: loadingExtensions, refetch } = useQuery({
    queryKey: ['php-extensions', selectedVersion],
    queryFn: async () => {
      const res = await api.get(`/api/php/extensions/${selectedVersion}`);
      return res.data;
    },
    enabled: !!selectedVersion
  });

  // Install single extension
  const installSingle = async (extension) => {
    const res = await api.post(`/api/php/extensions/${selectedVersion}/install`, { extension });
    return res.data;
  };

  // Batch install - install selected extensions sequentially
  const handleBatchInstall = async () => {
    const toInstall = Array.from(selectedExtensions);
    if (toInstall.length === 0) {
      toast.error('Please select extensions to install');
      return;
    }

    setIsInstalling(true);
    setInstallProgress({ current: 0, total: toInstall.length, name: '' });

    let successCount = 0;
    let failedExtensions = [];

    for (let i = 0; i < toInstall.length; i++) {
      const ext = toInstall[i];
      setInstallProgress({ current: i + 1, total: toInstall.length, name: ext });

      try {
        await installSingle(ext);
        successCount++;
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message;
        failedExtensions.push({ name: ext, error: errorMsg });

        // Check if it's an apt lock error that caused failure - stop batch
        // Note: "Waiting for apt lock" is handled by the script, only stop on actual failure
        if (errorMsg.includes('apt is locked') || errorMsg.includes('Could not get lock')) {
          toast.error(`Installation stopped: apt is locked. Please wait for other package operations to complete.`);
          break;
        }
      }
    }

    setIsInstalling(false);
    setInstallProgress({ current: 0, total: 0, name: '' });
    setSelectedExtensions(new Set());

    // Refresh data - use refetch for immediate update
    await refetch();

    // Show result
    if (failedExtensions.length === 0) {
      toast.success(`Successfully installed ${successCount} extension(s)`);
    } else if (successCount > 0) {
      toast.success(`Installed ${successCount} extension(s), ${failedExtensions.length} failed`);
    } else {
      toast.error(`Failed to install extensions`);
    }
  };

  // Remove extension mutation
  const removeMutation = useMutation({
    mutationFn: async (extension) => {
      setRemovingExt(extension);
      await api.delete(`/api/php/extensions/${selectedVersion}/${extension}`);
      return extension;
    },
    onSuccess: async (extension) => {
      toast.success(`Extension ${extension} removed successfully`);
      // Wait for refetch to complete before clearing state
      await refetch();
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

  // Toggle extension selection
  const toggleSelection = (extName) => {
    const newSelection = new Set(selectedExtensions);
    if (newSelection.has(extName)) {
      newSelection.delete(extName);
    } else {
      newSelection.add(extName);
    }
    setSelectedExtensions(newSelection);
  };

  // Select all uninstalled
  const selectAllUninstalled = () => {
    const uninstalled = sortedExtensions.filter(ext => !ext.installed).map(ext => ext.name);
    setSelectedExtensions(new Set(uninstalled));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedExtensions(new Set());
  };

  // Count installed
  const installedCount = extensionsData?.extensions?.filter(e => e.installed).length || 0;
  const totalCount = extensionsData?.extensions?.length || 0;
  const uninstalledInView = sortedExtensions.filter(ext => !ext.installed).length;

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
                onClick={() => changeVersion(version)}
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

      {/* Batch Actions Bar */}
      {selectedExtensions.size > 0 && (
        <div className="card p-4 mb-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-primary-700 dark:text-primary-400">
                {selectedExtensions.size} extension(s) selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Clear selection
              </button>
            </div>
            <button
              onClick={handleBatchInstall}
              disabled={isInstalling}
              className="btn btn-primary"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Installing {installProgress.current}/{installProgress.total}...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Install Selected
                </>
              )}
            </button>
          </div>

          {/* Progress indicator */}
          {isInstalling && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-primary-600 dark:text-primary-400">
                  Installing: {installProgress.name}
                </span>
                <span className="text-primary-600 dark:text-primary-400">
                  {installProgress.current}/{installProgress.total}
                </span>
              </div>
              <div className="w-full bg-primary-200 dark:bg-primary-800 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(installProgress.current / installProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extensions Table */}
      {loadingExtensions ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 dark:bg-dark-border px-4 py-3 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (selectedExtensions.size === uninstalledInView) {
                    clearSelection();
                  } else {
                    selectAllUninstalled();
                  }
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Select all uninstalled"
              >
                {selectedExtensions.size === uninstalledInView && uninstalledInView > 0 ? (
                  <CheckSquare className="w-5 h-5 text-primary-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="flex-1 font-medium text-sm text-gray-600 dark:text-gray-400">
                Extension
              </span>
              <span className="w-32 font-medium text-sm text-gray-600 dark:text-gray-400 text-center">
                Status
              </span>
              <span className="w-24 font-medium text-sm text-gray-600 dark:text-gray-400 text-center">
                Action
              </span>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200 dark:divide-dark-border max-h-[600px] overflow-y-auto">
            {sortedExtensions.map((ext) => (
              <div
                key={ext.name}
                className={`px-4 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors ${
                  selectedExtensions.has(ext.name) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => !ext.installed && toggleSelection(ext.name)}
                  disabled={ext.installed}
                  className={`${ext.installed ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary-600'}`}
                >
                  {selectedExtensions.has(ext.name) ? (
                    <CheckSquare className="w-5 h-5 text-primary-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Extension Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ext.name}</span>
                    {ext.popular && (
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" />
                    )}
                    <span className="text-xs text-gray-400 font-mono">{ext.package}</span>
                  </div>
                  {ext.description && (
                    <p className="text-sm text-gray-500 dark:text-dark-muted truncate">
                      {ext.description}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="w-32 text-center">
                  {ext.installed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Installed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-gray-400">
                      <XCircle className="w-3.5 h-3.5" />
                      Not Installed
                    </span>
                  )}
                </div>

                {/* Action */}
                <div className="w-24 text-center">
                  {ext.installed ? (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${ext.name}? This will restart PHP-FPM.`)) {
                          removeMutation.mutate(ext.name);
                        }
                      }}
                      disabled={removingExt === ext.name}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 transition-colors"
                    >
                      {removingExt === ext.name ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleSelection(ext.name)}
                      disabled={isInstalling}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        selectedExtensions.has(ext.name)
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-dark-border dark:hover:bg-dark-hover dark:text-gray-300'
                      }`}
                    >
                      {selectedExtensions.has(ext.name) ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          Select
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sortedExtensions.length === 0 && (
              <div className="py-12 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-dark-muted mb-4" />
                <p className="text-gray-500 dark:text-dark-muted">
                  {searchTerm || showOnlyInstalled || showOnlyPopular
                    ? 'No extensions match your filters'
                    : 'No extensions available'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>Select multiple extensions then click "Install Selected" to install them sequentially</li>
              <li>PHP-FPM will be restarted after each extension is installed/removed</li>
              <li>If installation fails with "apt lock" error, wait for other package operations to complete</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

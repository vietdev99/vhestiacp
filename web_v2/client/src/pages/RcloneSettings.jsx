import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Cloud, Plus, Trash2, RefreshCw, CheckCircle, XCircle,
  Loader2, Settings, HardDrive, Server, Key, Eye, EyeOff,
  ExternalLink, AlertCircle
} from 'lucide-react';

export default function RcloneSettings() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch remotes
  const { data: remotesData, isLoading } = useQuery({
    queryKey: ['rclone-remotes'],
    queryFn: async () => {
      const res = await api.get('/api/rclone/remotes');
      return res.data;
    }
  });

  // Fetch providers
  const { data: providersData } = useQuery({
    queryKey: ['rclone-providers'],
    queryFn: async () => {
      const res = await api.get('/api/rclone/providers');
      return res.data;
    }
  });

  // Delete remote mutation
  const deleteMutation = useMutation({
    mutationFn: async (name) => {
      await api.delete(`/api/rclone/remote/${name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rclone-remotes']);
      setDeleteConfirm(null);
    }
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (name) => {
      const res = await api.post(`/api/rclone/remote/${name}/test`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rclone-remotes']);
    }
  });

  const remotes = remotesData?.remotes || [];
  const providers = providersData?.providers || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Cloud className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cloud Storage (Rclone)</h1>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Configure cloud storage remotes for backups
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Remote
        </button>
      </div>

      {/* Remotes List */}
      <div className="card">
        {remotes.length === 0 ? (
          <div className="p-8 text-center">
            <Cloud className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Cloud Remotes Configured</h3>
            <p className="text-gray-500 dark:text-dark-muted mb-4">
              Add a cloud storage remote to enable backup to Google Drive, S3, Dropbox, and more.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Remote
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {remotes.map((remote) => (
              <div key={remote.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-border">
                    {getProviderIcon(remote.type)}
                  </div>
                  <div>
                    <div className="font-medium">{remote.name}</div>
                    <div className="text-sm text-gray-500 dark:text-dark-muted">
                      {getProviderLabel(remote.type)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Connection Status */}
                  <span className={`flex items-center gap-1 text-sm ${
                    remote.connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {remote.connected ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Disconnected
                      </>
                    )}
                  </span>

                  {/* Actions */}
                  <button
                    onClick={() => testMutation.mutate(remote.name)}
                    disabled={testMutation.isPending}
                    className="btn btn-secondary btn-sm"
                    title="Test Connection"
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(remote.name)}
                    className="btn btn-secondary btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete Remote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">How to use with Percona Backup</h4>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          After adding a cloud remote, you can select it as the storage destination in MongoDB Database Settings
          under the Percona Backup (PBM) section. Choose "RClone Remote" as storage type and select your configured remote.
        </p>
      </div>

      {/* Add Remote Modal */}
      {showAddModal && (
        <AddRemoteModal
          providers={providers}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries(['rclone-remotes']);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Delete Remote</h3>
            <p className="text-gray-600 dark:text-dark-muted mb-6">
              Are you sure you want to delete the remote "{deleteConfirm}"?
              This will remove the configuration but won't delete any files on the remote storage.
            </p>
            <div className="flex justify-end gap-3">
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
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddRemoteModal({ providers, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [remoteName, setRemoteName] = useState('');
  const [config, setConfig] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [oauthState, setOauthState] = useState(null); // { status: 'idle' | 'authorizing' | 'waiting' | 'success' | 'error', authUrl, pid, error }
  const pollIntervalRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/rclone/remote', data);
      return res.data;
    },
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    // Initialize config with default values
    const defaultConfig = {};
    provider.fields.forEach(field => {
      if (field.value !== undefined) {
        defaultConfig[field.name] = field.value;
      }
    });
    setConfig(defaultConfig);
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: remoteName,
      type: selectedProvider.id,
      config
    });
  };

  const updateConfig = (name, value) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const toggleShowSecret = (name) => {
    setShowSecrets(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Start OAuth authorization
  const startOAuth = async () => {
    if (!selectedProvider) return;

    setOauthState({ status: 'authorizing' });

    try {
      const res = await api.post('/api/rclone/oauth/authorize', {
        provider: selectedProvider.id
      });

      if (res.data.authUrl) {
        setOauthState({
          status: 'waiting',
          authUrl: res.data.authUrl,
          pid: res.data.pid
        });

        // Start polling for token
        pollIntervalRef.current = setInterval(async () => {
          try {
            const tokenRes = await api.get(`/api/rclone/oauth/token/${res.data.pid}`);
            if (tokenRes.data.completed && tokenRes.data.token) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              setConfig(prev => ({ ...prev, token: tokenRes.data.token }));
              setOauthState({ status: 'success' });
            }
          } catch (e) {
            // Keep polling
          }
        }, 2000);

        // Stop polling after 2 minutes
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            if (oauthState?.status === 'waiting') {
              setOauthState({ status: 'error', error: 'Authorization timed out. Please try again.' });
            }
          }
        }, 120000);
      } else {
        setOauthState({ status: 'error', error: 'Failed to get authorization URL' });
      }
    } catch (error) {
      setOauthState({
        status: 'error',
        error: error.response?.data?.error || 'Failed to start authorization'
      });
    }
  };

  // Cancel OAuth
  const cancelOAuth = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setOauthState(null);
  };

  // Group providers by type
  const oauthProviders = providers.filter(p => p.authType === 'oauth');
  const keyProviders = providers.filter(p => p.authType === 'keys');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold">Add Cloud Remote</h2>
        </div>

        {/* Step 1: Select Provider */}
        {step === 1 && (
          <div className="p-6">
            <p className="text-gray-600 dark:text-dark-muted mb-4">
              Select a cloud storage provider:
            </p>

            {/* OAuth Providers */}
            <h4 className="text-sm font-medium text-gray-500 mb-2">OAuth Providers (Requires Token)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {oauthProviders.map((provider, idx) => (
                <button
                  key={`${provider.id}-${idx}`}
                  onClick={() => handleProviderSelect(provider)}
                  className="p-4 border border-gray-200 dark:border-dark-border rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider.id)}
                    <span className="font-medium">{provider.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Key-based Providers */}
            <h4 className="text-sm font-medium text-gray-500 mb-2">Key-based Providers</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {keyProviders.map((provider, idx) => (
                <button
                  key={`${provider.id}-${provider.subType || ''}-${idx}`}
                  onClick={() => handleProviderSelect(provider)}
                  className="p-4 border border-gray-200 dark:border-dark-border rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider.id)}
                    <span className="font-medium text-sm">{provider.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && selectedProvider && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {getProviderIcon(selectedProvider.id)}
              <span className="font-medium">{selectedProvider.name}</span>
            </div>

            {/* Remote Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Remote Name *</label>
              <input
                type="text"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                placeholder="e.g., mybackup"
                pattern="^[a-zA-Z0-9_-]+$"
                required
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers, underscores and hyphens allowed
              </p>
            </div>

            {/* OAuth Authorization */}
            {selectedProvider.authType === 'oauth' && (
              <div className="space-y-3">
                {/* OAuth Status */}
                {oauthState?.status === 'waiting' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-300">
                        Waiting for authorization...
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                      Click the button below to open the authorization page. After approving, the token will be captured automatically.
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={oauthState.authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open Authorization Page
                      </a>
                      <button
                        type="button"
                        onClick={cancelOAuth}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {oauthState?.status === 'success' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-800 dark:text-green-300 font-medium">
                        Authorization successful! Token captured.
                      </span>
                    </div>
                  </div>
                )}

                {oauthState?.status === 'error' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-800 dark:text-red-300">
                        {oauthState.error}
                      </span>
                    </div>
                  </div>
                )}

                {oauthState?.status === 'authorizing' && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting authorization...</span>
                    </div>
                  </div>
                )}

                {/* Authorize Button or Manual Input */}
                {(!oauthState || oauthState.status === 'error') && !config.token && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Click the button below to authorize with {selectedProvider.name}:
                    </p>
                    <button
                      type="button"
                      onClick={startOAuth}
                      disabled={oauthState?.status === 'authorizing'}
                      className="btn btn-primary"
                    >
                      {oauthState?.status === 'authorizing' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Authorize with {selectedProvider.name}
                        </>
                      )}
                    </button>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 mb-2">
                        Or manually paste the token (run <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">rclone authorize {selectedProvider.id}</code> on a machine with a browser):
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Provider Fields */}
            {selectedProvider.fields.map((field) => {
              if (field.type === 'hidden') return null;

              // For OAuth providers, hide token field if we have a successful auth
              // or show it collapsed under manual input section
              if (selectedProvider.authType === 'oauth' && field.name === 'token') {
                // If OAuth success or has token, show readonly display
                if (oauthState?.status === 'success' || config.token) {
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      <div className="relative">
                        <textarea
                          value={config[field.name] || ''}
                          onChange={(e) => updateConfig(field.name, e.target.value)}
                          className="input font-mono text-xs h-20 bg-green-50 dark:bg-green-900/20"
                          readOnly={oauthState?.status === 'success'}
                        />
                        {oauthState?.status === 'success' && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                      </div>
                      {config.token && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig(prev => ({ ...prev, token: '' }));
                            setOauthState(null);
                          }}
                          className="text-xs text-red-600 hover:underline mt-1"
                        >
                          Clear token and re-authorize
                        </button>
                      )}
                    </div>
                  );
                }
                // If no token and still in manual mode, show input
                return (
                  <div key={field.name}>
                    <textarea
                      value={config[field.name] || ''}
                      onChange={(e) => updateConfig(field.name, e.target.value)}
                      placeholder="Paste your token here..."
                      required={field.required}
                      className="input font-mono text-xs h-24"
                    />
                    {field.help && (
                      <p className="text-xs text-gray-500 mt-1">{field.help}</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-1">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={config[field.name] || ''}
                      onChange={(e) => updateConfig(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="input font-mono text-xs h-32"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={config[field.name] || ''}
                      onChange={(e) => updateConfig(field.name, e.target.value)}
                      required={field.required}
                      className="input"
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'password' ? (
                    <div className="relative">
                      <input
                        type={showSecrets[field.name] ? 'text' : 'password'}
                        value={config[field.name] || ''}
                        onChange={(e) => updateConfig(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(field.name)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      >
                        {showSecrets[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={config[field.name] || ''}
                      onChange={(e) => updateConfig(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="input"
                    />
                  )}
                  {field.help && (
                    <p className="text-xs text-gray-500 mt-1">{field.help}</p>
                  )}
                </div>
              );
            })}

            {/* Error Message */}
            {createMutation.isError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {createMutation.error?.response?.data?.error || 'Failed to create remote'}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !remoteName}
                  className="btn btn-primary"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Remote'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getProviderIcon(type) {
  switch (type) {
    case 'drive':
      return <Cloud className="w-5 h-5 text-green-500" />;
    case 'dropbox':
      return <Cloud className="w-5 h-5 text-blue-500" />;
    case 'onedrive':
      return <Cloud className="w-5 h-5 text-sky-500" />;
    case 's3':
      return <HardDrive className="w-5 h-5 text-orange-500" />;
    case 'b2':
      return <HardDrive className="w-5 h-5 text-red-500" />;
    case 'sftp':
    case 'ftp':
      return <Server className="w-5 h-5 text-purple-500" />;
    default:
      return <Cloud className="w-5 h-5 text-gray-500" />;
  }
}

function getProviderLabel(type) {
  const labels = {
    drive: 'Google Drive',
    dropbox: 'Dropbox',
    onedrive: 'Microsoft OneDrive',
    s3: 'Amazon S3 / Compatible',
    b2: 'Backblaze B2',
    sftp: 'SFTP',
    ftp: 'FTP'
  };
  return labels[type] || type;
}

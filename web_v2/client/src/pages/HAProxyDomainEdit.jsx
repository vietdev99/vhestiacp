import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Network,
  Server,
  Lock,
  Shield,
  Activity,
  ChevronDown,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_TYPES = [
  { value: 'pm2', label: 'PM2 Application', description: 'Node.js apps managed by PM2' },
  { value: 'static', label: 'Static Files', description: 'Static file serving via Nginx' },
  { value: 'php', label: 'PHP Application', description: 'PHP-FPM backend' },
  { value: 'custom', label: 'Custom Backend', description: 'Custom server configuration' }
];

const SSL_MODES = [
  { value: 'none', label: 'No SSL', description: 'HTTP only, no encryption' },
  { value: 'termination', label: 'SSL Termination', description: 'HAProxy handles SSL, backend receives HTTP' },
  { value: 'passthrough', label: 'SSL Passthrough', description: 'SSL passes through to backend' }
];

export default function HAProxyDomainEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { domain } = useParams();
  const decodedDomain = decodeURIComponent(domain);

  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    backendHost: '127.0.0.1',
    backendPort: '3000',
    backendType: 'pm2',
    sslMode: 'termination',
    aliases: '',
    healthCheck: true,
    customConfig: '',
    enabled: true
  });

  // Fetch domain details
  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['haproxy-domain', decodedDomain],
    queryFn: async () => {
      const res = await api.get('/api/haproxy/domains');
      const domains = res.data?.domains || [];
      const domainConfig = domains.find(d => d.domain === decodedDomain);
      if (!domainConfig) {
        throw new Error('Domain not found');
      }
      return domainConfig;
    }
  });

  // Populate form when data loads
  useEffect(() => {
    if (data) {
      setFormData({
        backendHost: data.backend?.host || '127.0.0.1',
        backendPort: String(data.backend?.port || '3000'),
        backendType: data.backend?.type || 'pm2',
        sslMode: data.ssl?.mode || 'none',
        aliases: data.aliases?.join(' ') || '',
        healthCheck: data.options?.healthCheck ?? true,
        customConfig: data.options?.customConfig || '',
        enabled: data.enabled ?? true
      });
      // Show advanced if there are aliases or custom config
      if (data.aliases?.length > 0 || data.options?.customConfig) {
        setShowAdvanced(true);
      }
    }
  }, [data]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updateData) => {
      await api.put(`/api/haproxy/domains/${encodeURIComponent(decodedDomain)}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['haproxy-domains']);
      queryClient.invalidateQueries(['haproxy-domain', decodedDomain]);
      toast.success('Domain configuration updated');
      navigate('/haproxy/domains');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update domain configuration');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.backendPort || isNaN(formData.backendPort)) {
      setError('Backend port must be a valid number');
      return;
    }

    const port = parseInt(formData.backendPort);
    if (port < 1 || port > 65535) {
      setError('Backend port must be between 1 and 65535');
      return;
    }

    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Domain Not Found</h2>
          <p className="text-gray-500 dark:text-dark-muted mb-4">
            The domain "{decodedDomain}" was not found in your HAProxy configuration.
          </p>
          <Link to="/haproxy/domains" className="btn btn-primary">
            Back to HAProxy Domains
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/haproxy/domains" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary-600" />
            Edit HAProxy Domain
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Editing configuration for <span className="font-mono font-medium">{decodedDomain}</span>
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Domain
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
              <Network className="w-4 h-4 text-gray-400" />
              <span className="font-mono">{decodedDomain}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Domain cannot be changed. Delete and recreate to use a different domain.
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
            <div>
              <div className="font-medium">Domain Enabled</div>
              <div className="text-sm text-gray-500 dark:text-dark-muted">
                When disabled, traffic won't be routed through HAProxy
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Backend Configuration */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              Backend Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Backend Host */}
              <div>
                <label htmlFor="backendHost" className="block text-sm font-medium mb-1">
                  Backend Host
                </label>
                <input
                  type="text"
                  id="backendHost"
                  value={formData.backendHost}
                  onChange={(e) => setFormData({ ...formData, backendHost: e.target.value })}
                  className="input"
                  placeholder="127.0.0.1"
                />
              </div>

              {/* Backend Port */}
              <div>
                <label htmlFor="backendPort" className="block text-sm font-medium mb-1">
                  Backend Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="backendPort"
                  value={formData.backendPort}
                  onChange={(e) => setFormData({ ...formData, backendPort: e.target.value })}
                  className="input"
                  placeholder="3000"
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            {/* Backend Type */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Backend Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {BACKEND_TYPES.map(type => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.backendType === type.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="backendType"
                      value={type.value}
                      checked={formData.backendType === type.value}
                      onChange={(e) => setFormData({ ...formData, backendType: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 dark:text-dark-muted">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SSL Configuration */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" />
              SSL Configuration
            </h3>

            <div className="space-y-3">
              {SSL_MODES.map(mode => (
                <label
                  key={mode.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.sslMode === mode.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="sslMode"
                    value={mode.value}
                    checked={formData.sslMode === mode.value}
                    onChange={(e) => setFormData({ ...formData, sslMode: e.target.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{mode.label}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-muted">{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {formData.sslMode === 'termination' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    SSL certificates will be managed by HestiaCP's existing SSL system.
                    Make sure your domain has a valid SSL certificate configured.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Aliases */}
                <div>
                  <label htmlFor="aliases" className="block text-sm font-medium mb-1">
                    Domain Aliases
                  </label>
                  <input
                    type="text"
                    id="aliases"
                    value={formData.aliases}
                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                    className="input"
                    placeholder="www.example.com alias.example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Space-separated list of additional domains to route to this backend
                  </p>
                </div>

                {/* Health Check */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">Health Check</div>
                      <div className="text-xs text-gray-500 dark:text-dark-muted">
                        Monitor backend server availability
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.healthCheck}
                      onChange={(e) => setFormData({ ...formData, healthCheck: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Custom Config */}
                <div>
                  <label htmlFor="customConfig" className="block text-sm font-medium mb-1">
                    Custom HAProxy Config
                  </label>
                  <textarea
                    id="customConfig"
                    value={formData.customConfig}
                    onChange={(e) => setFormData({ ...formData, customConfig: e.target.value })}
                    className="input font-mono text-sm"
                    rows={4}
                    placeholder="# Additional HAProxy directives..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Advanced: Additional HAProxy backend directives
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-600" />
                Configuration Summary
              </h4>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Domain:</dt>
                  <dd className="font-medium">{decodedDomain}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className={formData.enabled ? 'text-green-600' : 'text-red-600'}>
                    {formData.enabled ? 'Enabled' : 'Disabled'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Backend:</dt>
                  <dd className="font-mono">{formData.backendHost}:{formData.backendPort}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type:</dt>
                  <dd>{BACKEND_TYPES.find(t => t.value === formData.backendType)?.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">SSL:</dt>
                  <dd>{SSL_MODES.find(m => m.value === formData.sslMode)?.label}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <Link to="/haproxy/domains" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

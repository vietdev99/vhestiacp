import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldX, Zap, Copy, X } from 'lucide-react';

export default function WebEdit() {
  const { domain } = useParams();
  const queryClient = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTab, setCloneTab] = useState('tpl');
  const [cloneData, setCloneData] = useState({ name: '', tpl: '', stpl: '' });
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const [formData, setFormData] = useState({
    ip: '',
    aliases: '',
    stats: 'none',
    // Redirect options
    redirectEnabled: false,
    redirectType: 'www',
    redirectCustom: '',
    // SSL
    sslEnabled: false,
    // Advanced
    webTemplate: 'default',
    backendTemplate: 'default',
    fastcgiCache: false,
    customDocRoot: false,
    docRoot: ''
  });

  // Fetch domain info
  const { data: domainData, isLoading } = useQuery({
    queryKey: ['web-domain', domain],
    queryFn: async () => {
      const res = await api.get(`/api/web/${domain}`);
      return res.data.domain;
    }
  });

  // Fetch system info
  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  // Update form when data loads
  useEffect(() => {
    if (domainData) {
      const aliases = domainData.ALIAS || `www.${domain}`;

      setFormData({
        ip: domainData.IP || '',
        aliases,
        stats: domainData.STATS || 'none',
        redirectEnabled: domainData.REDIRECT === 'yes',
        redirectType: domainData.REDIRECT_CODE === '301' ? 'www' : 'nowww',
        redirectCustom: domainData.REDIRECT_URL || '',
        sslEnabled: domainData.SSL === 'yes',
        webTemplate: domainData.TPL || 'default',
        backendTemplate: domainData.BACKEND || 'default',
        fastcgiCache: domainData.FASTCGI_CACHE === 'yes',
        customDocRoot: !!domainData.CUSTOM_DOCROOT,
        docRoot: domainData.CUSTOM_DOCROOT || ''
      });
    }
  }, [domainData, domain]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/api/web/${domain}`, data);
      return res.data;
    },
    onSuccess: () => {
      setSuccess('Domain updated successfully');
      setError('');
      queryClient.invalidateQueries(['web-domain', domain]);
      queryClient.invalidateQueries(['web-domains']);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update domain');
      setSuccess('');
    }
  });

  const sslMutation = useMutation({
    mutationFn: async (enable) => {
      if (enable) {
        await api.post(`/api/web/${domain}/ssl`, { letsencrypt: true });
      } else {
        await api.delete(`/api/web/${domain}/ssl`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['web-domain', domain]);
      queryClient.invalidateQueries(['web-domains']);
      setSuccess('SSL settings updated');
      setFormData(prev => ({ ...prev, sslEnabled: !prev.sslEnabled }));
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update SSL');
    }
  });

  const openCloneModal = async () => {
    const templateName = formData.webTemplate;
    if (!templateName) return;

    setCloneError('');
    setCloneLoading(true);
    setCloneModalOpen(true);
    setCloneTab('tpl');

    try {
      const res = await api.get(`/api/system/templates/${templateName}`);
      setCloneData({
        name: `${templateName}-custom`,
        tpl: res.data.tpl || '',
        stpl: res.data.stpl || ''
      });
    } catch (err) {
      setCloneError('Failed to load template content');
    } finally {
      setCloneLoading(false);
    }
  };

  const saveCloneTemplate = async () => {
    if (!cloneData.name) {
      setCloneError('Template name is required');
      return;
    }

    setCloneError('');
    setCloneLoading(true);

    try {
      await api.post('/api/system/templates', cloneData);
      setCloneModalOpen(false);
      queryClient.invalidateQueries(['system-info']);
      setSuccess(`Template "${cloneData.name}" created successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setCloneError(err.response?.data?.error || 'Failed to create template');
    } finally {
      setCloneLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    updateMutation.mutate({
      ip: formData.ip,
      aliases: formData.aliases,
      stats: formData.stats,
      redirect: formData.redirectEnabled ? 'yes' : 'no',
      redirectType: formData.redirectType,
      redirectCustom: formData.redirectCustom,
      webTemplate: formData.webTemplate,
      backendTemplate: formData.backendTemplate,
      fastcgiCache: formData.fastcgiCache ? 'yes' : 'no',
      customDocRoot: formData.customDocRoot ? formData.docRoot : ''
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!domainData) {
    return (
      <div className="card p-6 text-center text-red-600">
        Domain not found.
      </div>
    );
  }

  const hasSSL = domainData.SSL === 'yes';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/web"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Web Domain</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/web/${domain}/quick-install`} className="btn btn-secondary">
            <Zap className="w-4 h-4 mr-2" />
            Quick Install App
          </Link>
          <button
            type="submit"
            form="webEditForm"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Form */}
      <div className="card p-6">
        <form id="webEditForm" onSubmit={handleSubmit} className="space-y-6">
          {/* Domain (readonly) */}
          <div>
            <label className="block text-sm font-medium mb-1">Domain</label>
            <input
              type="text"
              value={domain}
              className="input bg-gray-100 dark:bg-dark-border"
              disabled
            />
          </div>

          {/* Aliases */}
          <div>
            <label htmlFor="aliases" className="block text-sm font-medium mb-1">
              Aliases
            </label>
            <textarea
              id="aliases"
              value={formData.aliases}
              onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
              className="input min-h-[80px]"
              placeholder={`www.${domain}`}
            />
          </div>

          {/* IP Address */}
          <div>
            <label htmlFor="ip" className="block text-sm font-medium mb-1">
              IP Address
            </label>
            <select
              id="ip"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="input"
            >
              <option value="">* (All IP Addresses)</option>
              {systemInfo?.ips?.map((ip) => (
                <option key={ip} value={ip}>{ip}</option>
              ))}
            </select>
          </div>

          {/* Web Statistics */}
          <div>
            <label htmlFor="stats" className="block text-sm font-medium mb-1">
              Web Statistics
            </label>
            <select
              id="stats"
              value={formData.stats}
              onChange={(e) => setFormData({ ...formData, stats: e.target.value })}
              className="input"
            >
              {systemInfo?.webStats?.map((stat) => (
                <option key={stat} value={stat}>{stat}</option>
              )) || (
                <>
                  <option value="none">none</option>
                  <option value="awstats">awstats</option>
                  <option value="webalizer">webalizer</option>
                </>
              )}
            </select>
          </div>

          {/* Domain Redirection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.redirectEnabled}
                onChange={(e) => setFormData({ ...formData, redirectEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Enable domain redirection</span>
            </label>

            {formData.redirectEnabled && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="redirectType"
                    checked={formData.redirectType === 'www'}
                    onChange={() => setFormData({ ...formData, redirectType: 'www' })}
                    className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Redirect visitors to www.{domain}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="redirectType"
                    checked={formData.redirectType === 'nowww'}
                    onChange={() => setFormData({ ...formData, redirectType: 'nowww' })}
                    className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Redirect visitors to {domain}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="redirectType"
                    checked={formData.redirectType === 'custom'}
                    onChange={() => setFormData({ ...formData, redirectType: 'custom' })}
                    className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Redirect visitors to a custom domain or web address</span>
                </label>
                {formData.redirectType === 'custom' && (
                  <input
                    type="text"
                    value={formData.redirectCustom}
                    onChange={(e) => setFormData({ ...formData, redirectCustom: e.target.value })}
                    className="input ml-6"
                    placeholder="https://example.com"
                  />
                )}
              </div>
            )}
          </div>

          {/* Enable SSL */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sslEnabled}
                onChange={() => sslMutation.mutate(!formData.sslEnabled)}
                disabled={sslMutation.isPending}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Enable SSL for this domain</span>
              {sslMutation.isPending && (
                <div className="w-4 h-4 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
              )}
            </label>
            {hasSSL && domainData.LETSENCRYPT === 'yes' && (
              <p className="text-xs text-gray-500 dark:text-dark-muted ml-6">
                Using Let's Encrypt certificate
              </p>
            )}
          </div>

          {/* Advanced Options */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn btn-secondary w-full justify-center"
            >
              Advanced Options
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-dark-border">
              {/* Web Template */}
              <div>
                <label htmlFor="webTemplate" className="block text-sm font-medium mb-1">
                  Web Template <span className="text-gray-400 text-xs">NGINX</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="webTemplate"
                    value={formData.webTemplate}
                    onChange={(e) => setFormData({ ...formData, webTemplate: e.target.value })}
                    className="input flex-1"
                  >
                    {systemInfo?.webTemplates?.map((tpl) => (
                      <option key={tpl} value={tpl}>{tpl}</option>
                    )) || <option value="default">default</option>}
                  </select>
                  <button
                    type="button"
                    onClick={openCloneModal}
                    className="btn btn-secondary"
                    title="Clone template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* FastCGI Cache */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.fastcgiCache}
                    onChange={(e) => setFormData({ ...formData, fastcgiCache: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Enable FastCGI cache</span>
                  <span className="text-xs text-gray-400" title="Improves performance by caching PHP responses">?</span>
                </label>
              </div>

              {/* Backend Template */}
              <div>
                <label htmlFor="backendTemplate" className="block text-sm font-medium mb-1">
                  Backend Template <span className="text-gray-400 text-xs">PHP-FPM</span>
                </label>
                <select
                  id="backendTemplate"
                  value={formData.backendTemplate}
                  onChange={(e) => setFormData({ ...formData, backendTemplate: e.target.value })}
                  className="input"
                >
                  {systemInfo?.backendTemplates?.map((tpl) => (
                    <option key={tpl} value={tpl}>{tpl}</option>
                  )) || <option value="default">default</option>}
                </select>
              </div>

              {/* Custom Document Root */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.customDocRoot}
                    onChange={(e) => setFormData({ ...formData, customDocRoot: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Custom document root</span>
                </label>
                {formData.customDocRoot && (
                  <input
                    type="text"
                    value={formData.docRoot}
                    onChange={(e) => setFormData({ ...formData, docRoot: e.target.value })}
                    className="input ml-6"
                    placeholder="/public"
                  />
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Clone Template Modal */}
      {cloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCloneModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-semibold">Clone Template</h3>
              <button
                onClick={() => setCloneModalOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {cloneError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {cloneError}
                </div>
              )}

              {/* Template Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  New Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cloneData.name}
                  onChange={(e) => setCloneData({ ...cloneData, name: e.target.value })}
                  className="input"
                  placeholder="my-custom-template"
                />
                <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
                  Use only letters, numbers, dashes, and underscores
                </p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-dark-border mb-4">
                <button
                  type="button"
                  onClick={() => setCloneTab('tpl')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    cloneTab === 'tpl'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  HTTP (.tpl)
                </button>
                <button
                  type="button"
                  onClick={() => setCloneTab('stpl')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    cloneTab === 'stpl'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  HTTPS/SSL (.stpl)
                </button>
              </div>

              {/* Template Content */}
              {cloneLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <textarea
                  value={cloneTab === 'tpl' ? cloneData.tpl : cloneData.stpl}
                  onChange={(e) =>
                    setCloneData({
                      ...cloneData,
                      [cloneTab]: e.target.value
                    })
                  }
                  className="input font-mono text-sm min-h-[400px]"
                  placeholder={`Enter ${cloneTab === 'tpl' ? 'HTTP' : 'HTTPS'} template content...`}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setCloneModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCloneTemplate}
                disabled={cloneLoading}
                className="btn btn-primary"
              >
                {cloneLoading ? 'Saving...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function WebAdd() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    domain: '',
    ip: '',
    aliases: '',
    proxySupport: true,
    proxyExtensions: 'jpg,jpeg,gif,png,ico,svg,css,zip,tgz,gz,rar,bz2,doc,xls,exe,pdf,ppt,txt,odt,ods,odp,odf,tar,wav,bmp,rtf,js,mp3,avi,mpeg,flv,woff,woff2',
    enableSSL: false
  });

  // Fetch system info for IP addresses
  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/web', data);
      return res.data;
    },
    onSuccess: async (_, variables) => {
      // If SSL was requested, enable it after domain creation
      if (formData.enableSSL) {
        try {
          await api.post(`/api/web/${variables.domain}/ssl`, { letsencrypt: true });
        } catch (e) {
          console.warn('Failed to enable SSL:', e);
        }
      }
      queryClient.invalidateQueries(['web-domains']);
      navigate('/web');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create domain');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.domain) {
      setError('Domain is required');
      return;
    }

    // Convert newlines and spaces to commas for aliases
    const aliasesNormalized = formData.aliases
      .split(/[\n\r,]+/)
      .map(a => a.trim())
      .filter(a => a)
      .join(',');

    createMutation.mutate({
      domain: formData.domain.toLowerCase().trim(),
      ip: formData.ip,
      aliases: aliasesNormalized,
      proxySupport: formData.proxySupport ? 'yes' : 'no',
      proxyExtensions: formData.proxyExtensions
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/web"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Web Domain</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Create a new website
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
          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-1">
              Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="input"
              placeholder="example.com"
              required
            />
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
              www.{formData.domain || 'example.com'} will be added automatically as an alias
            </p>
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

          {/* Aliases */}
          <div>
            <label htmlFor="aliases" className="block text-sm font-medium mb-1">
              Additional Aliases
            </label>
            <textarea
              id="aliases"
              value={formData.aliases}
              onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
              className="input min-h-[80px]"
              placeholder="alias1.com&#10;alias2.com&#10;alias3.com"
              rows={3}
            />
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
              One alias per line, or comma-separated
            </p>
          </div>

          {/* Enable SSL */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.enableSSL}
                onChange={(e) => setFormData({ ...formData, enableSSL: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Enable SSL with Let's Encrypt</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 ml-6">
              Automatically obtain and install a free SSL certificate
            </p>
          </div>

          {/* Advanced Options */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn btn-secondary w-full justify-between"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-dark-border/30 rounded-lg">
              {/* Proxy Support */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.proxySupport}
                    onChange={(e) => setFormData({ ...formData, proxySupport: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Enable Proxy Support (Nginx)</span>
                </label>
              </div>

              {/* Proxy Extensions */}
              {formData.proxySupport && (
                <div>
                  <label htmlFor="proxyExtensions" className="block text-sm font-medium mb-1">
                    Proxy Extensions
                  </label>
                  <input
                    type="text"
                    id="proxyExtensions"
                    value={formData.proxyExtensions}
                    onChange={(e) => setFormData({ ...formData, proxyExtensions: e.target.value })}
                    className="input text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
                    File extensions to be served directly by Nginx
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Domain'
              )}
            </button>
            <Link to="/web" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

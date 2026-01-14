import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Package, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PackageAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const copyFrom = searchParams.get('copy');

  const [formData, setFormData] = useState({
    name: '',
    webDomains: 'unlimited',
    webAliases: 'unlimited',
    dnsDomains: 'unlimited',
    dnsRecords: 'unlimited',
    mailDomains: 'unlimited',
    mailAccounts: 'unlimited',
    databases: 'unlimited',
    cronJobs: 'unlimited',
    diskQuota: 'unlimited',
    bandwidth: 'unlimited',
    backups: '1',
    ns1: '',
    ns2: '',
    shell: 'nologin',
    webTemplate: 'default',
    proxyTemplate: 'default',
    dnsTemplate: 'default'
  });

  // Fetch system info for templates
  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  // Fetch package to copy from
  const { data: copyPackage } = useQuery({
    queryKey: ['package', copyFrom],
    queryFn: async () => {
      const res = await api.get(`/api/packages/${copyFrom}`);
      return res.data.package;
    },
    enabled: !!copyFrom
  });

  // Pre-fill form when copying
  useEffect(() => {
    if (copyPackage) {
      setFormData({
        name: `${copyPackage.name}_copy`,
        webDomains: copyPackage.WEB_DOMAINS || 'unlimited',
        webAliases: copyPackage.WEB_ALIASES || 'unlimited',
        dnsDomains: copyPackage.DNS_DOMAINS || 'unlimited',
        dnsRecords: copyPackage.DNS_RECORDS || 'unlimited',
        mailDomains: copyPackage.MAIL_DOMAINS || 'unlimited',
        mailAccounts: copyPackage.MAIL_ACCOUNTS || 'unlimited',
        databases: copyPackage.DATABASES || 'unlimited',
        cronJobs: copyPackage.CRON_JOBS || 'unlimited',
        diskQuota: copyPackage.DISK_QUOTA || 'unlimited',
        bandwidth: copyPackage.BANDWIDTH || 'unlimited',
        backups: copyPackage.BACKUPS || '1',
        ns1: copyPackage.NS?.split(',')[0] || '',
        ns2: copyPackage.NS?.split(',')[1] || '',
        shell: copyPackage.SHELL || 'nologin',
        webTemplate: copyPackage.WEB_TEMPLATE || 'default',
        proxyTemplate: copyPackage.PROXY_TEMPLATE || 'default',
        dnsTemplate: copyPackage.DNS_TEMPLATE || 'default'
      });
    }
  }, [copyPackage]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/packages', data);
    },
    onSuccess: () => {
      toast.success('Package created successfully');
      navigate('/packages');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create package');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/packages"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {copyFrom ? 'Duplicate Package' : 'Add Package'}
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            {copyFrom ? `Creating copy of ${copyFrom}` : 'Create a new hosting package'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Package Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="e.g., basic, premium, enterprise"
                required
                pattern="[a-zA-Z0-9_-]+"
                title="Only letters, numbers, dashes and underscores"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers, dashes and underscores allowed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shell Access</label>
              <select
                name="shell"
                value={formData.shell}
                onChange={handleChange}
                className="input"
              >
                {systemInfo?.shells?.map(shell => (
                  <option key={shell} value={shell}>
                    {shell === '/usr/sbin/nologin' ? 'nologin (No shell access)' : shell}
                  </option>
                )) || (
                  <>
                    <option value="nologin">nologin (No shell access)</option>
                    <option value="/bin/bash">/bin/bash</option>
                    <option value="/bin/sh">/bin/sh</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Backups</label>
              <input
                type="number"
                name="backups"
                value={formData.backups}
                onChange={handleChange}
                className="input"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Resource Limits */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Resource Limits</h2>
          <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
            Use "unlimited" or "0" for no limit
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Web Domains</label>
              <input
                type="text"
                name="webDomains"
                value={formData.webDomains}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Web Aliases</label>
              <input
                type="text"
                name="webAliases"
                value={formData.webAliases}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DNS Domains</label>
              <input
                type="text"
                name="dnsDomains"
                value={formData.dnsDomains}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DNS Records</label>
              <input
                type="text"
                name="dnsRecords"
                value={formData.dnsRecords}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mail Domains</label>
              <input
                type="text"
                name="mailDomains"
                value={formData.mailDomains}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mail Accounts</label>
              <input
                type="text"
                name="mailAccounts"
                value={formData.mailAccounts}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Databases</label>
              <input
                type="text"
                name="databases"
                value={formData.databases}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cron Jobs</label>
              <input
                type="text"
                name="cronJobs"
                value={formData.cronJobs}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Disk Quota (MB)</label>
              <input
                type="text"
                name="diskQuota"
                value={formData.diskQuota}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bandwidth (MB)</label>
              <input
                type="text"
                name="bandwidth"
                value={formData.bandwidth}
                onChange={handleChange}
                className="input"
                placeholder="unlimited"
              />
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Default Templates</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Web Template</label>
              <select
                name="webTemplate"
                value={formData.webTemplate}
                onChange={handleChange}
                className="input"
              >
                <option value="default">default</option>
                {systemInfo?.webTemplates?.filter(t => t !== 'default').map(tpl => (
                  <option key={tpl} value={tpl}>{tpl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Proxy Template</label>
              <select
                name="proxyTemplate"
                value={formData.proxyTemplate}
                onChange={handleChange}
                className="input"
              >
                <option value="default">default</option>
                {systemInfo?.webTemplates?.filter(t => t !== 'default').map(tpl => (
                  <option key={tpl} value={tpl}>{tpl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DNS Template</label>
              <select
                name="dnsTemplate"
                value={formData.dnsTemplate}
                onChange={handleChange}
                className="input"
              >
                <option value="default">default</option>
              </select>
            </div>
          </div>
        </div>

        {/* Nameservers */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Nameservers</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">NS1</label>
              <input
                type="text"
                name="ns1"
                value={formData.ns1}
                onChange={handleChange}
                className="input"
                placeholder="ns1.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NS2</label>
              <input
                type="text"
                name="ns2"
                value={formData.ns2}
                onChange={handleChange}
                className="input"
                placeholder="ns2.example.com"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/packages" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Package
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

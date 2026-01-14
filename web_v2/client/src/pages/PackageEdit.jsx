import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Save, Loader2, Globe, Mail, Database, HardDrive, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// Collapsible section component
function Section({ title, icon: Icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-border/50 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold">
          {Icon && <Icon className="w-5 h-5" />}
          {title}
        </div>
        {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

// Unlimited input component with infinity toggle
function UnlimitedInput({ label, name, value, onChange, suffix = "" }) {
  const isUnlimited = value === 'unlimited' || value === '0';

  const toggleUnlimited = () => {
    onChange({ target: { name, value: isUnlimited ? '1000' : 'unlimited' } });
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          type={isUnlimited ? "text" : "number"}
          name={name}
          value={isUnlimited ? "Unlimited" : value}
          onChange={onChange}
          className="input pr-12"
          placeholder="0"
          disabled={isUnlimited}
        />
        <button
          type="button"
          onClick={toggleUnlimited}
          className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded ${
            isUnlimited
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-gray-100 text-gray-500 dark:bg-dark-border dark:text-gray-400'
          }`}
          title={isUnlimited ? "Set limit" : "Set unlimited"}
        >
          ∞
        </button>
      </div>
      {suffix && <p className="text-xs text-gray-500 mt-1">{suffix}</p>}
    </div>
  );
}

export default function PackageEdit() {
  const { name } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    diskQuota: 'unlimited',
    bandwidth: 'unlimited',
    backups: '1',
    backupsIncremental: 'no',
    webDomains: 'unlimited',
    webAliases: 'unlimited',
    webTemplate: 'default',
    backendTemplate: 'default',
    dnsDomains: 'unlimited',
    dnsRecords: 'unlimited',
    dnsTemplate: 'default',
    ns1: '',
    ns2: '',
    mailDomains: 'unlimited',
    mailAccounts: 'unlimited',
    rateLimit: '200',
    databases: 'unlimited',
    cronJobs: 'unlimited',
    shell: 'nologin'
  });

  const [nameServers, setNameServers] = useState(['', '']);

  const { data: pkg, isLoading, error } = useQuery({
    queryKey: ['package', name],
    queryFn: async () => {
      const res = await api.get(`/api/packages/${name}`);
      return res.data.package;
    }
  });

  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  useEffect(() => {
    if (pkg) {
      const ns = pkg.NS ? pkg.NS.split(',') : ['', ''];
      setNameServers(ns.length >= 2 ? ns : [ns[0] || '', '']);

      setFormData({
        diskQuota: pkg.DISK_QUOTA || 'unlimited',
        bandwidth: pkg.BANDWIDTH || 'unlimited',
        backups: pkg.BACKUPS || '1',
        backupsIncremental: pkg.BACKUPS_INCREMENTAL || 'no',
        webDomains: pkg.WEB_DOMAINS || 'unlimited',
        webAliases: pkg.WEB_ALIASES || 'unlimited',
        webTemplate: pkg.WEB_TEMPLATE || 'default',
        backendTemplate: pkg.BACKEND_TEMPLATE || 'default',
        dnsDomains: pkg.DNS_DOMAINS || 'unlimited',
        dnsRecords: pkg.DNS_RECORDS || 'unlimited',
        dnsTemplate: pkg.DNS_TEMPLATE || 'default',
        ns1: ns[0] || '',
        ns2: ns[1] || '',
        mailDomains: pkg.MAIL_DOMAINS || 'unlimited',
        mailAccounts: pkg.MAIL_ACCOUNTS || 'unlimited',
        rateLimit: pkg.RATE_LIMIT || '200',
        databases: pkg.DATABASES || 'unlimited',
        cronJobs: pkg.CRON_JOBS || 'unlimited',
        shell: pkg.SHELL || 'nologin'
      });
    }
  }, [pkg]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await api.put(`/api/packages/${name}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['packages']);
      queryClient.invalidateQueries(['package', name]);
      toast.success('Package updated successfully');
      navigate('/packages');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update package');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      ns: `${formData.ns1},${formData.ns2}`.replace(/^,|,$/g, '')
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addNameServer = () => {
    setNameServers([...nameServers, '']);
  };

  const updateNameServer = (index, value) => {
    const updated = [...nameServers];
    updated[index] = value;
    setNameServers(updated);
    setFormData(prev => ({
      ...prev,
      ns1: updated[0] || '',
      ns2: updated[1] || ''
    }));
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
        <p className="text-red-500">Failed to load package. {error.response?.data?.error || ''}</p>
        <Link to="/packages" className="btn btn-secondary mt-4">Back to Packages</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/packages" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Package</h1>
        </div>
        <button type="submit" form="packageForm" disabled={updateMutation.isPending} className="btn btn-primary">
          {updateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Changes</>
          )}
        </button>
      </div>

      <form id="packageForm" onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="card p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Package Name</label>
              <input type="text" value={name} className="input bg-gray-50 dark:bg-dark-border" disabled />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UnlimitedInput label="Quota" name="diskQuota" value={formData.diskQuota} onChange={handleChange} suffix="in MB" />
              <UnlimitedInput label="Bandwidth" name="bandwidth" value={formData.bandwidth} onChange={handleChange} suffix="in MB" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Backups</label>
                <input type="number" name="backups" value={formData.backups} onChange={handleChange} className="input" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Incremental Backups</label>
                <select name="backupsIncremental" value={formData.backupsIncremental} onChange={handleChange} className="input">
                  <option value="no">Disabled</option>
                  <option value="yes">Enabled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* WEB Section */}
        <Section title="WEB" icon={Globe}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UnlimitedInput label="Web Domains" name="webDomains" value={formData.webDomains} onChange={handleChange} />
              <UnlimitedInput label="Web Aliases" name="webAliases" value={formData.webAliases} onChange={handleChange} suffix="per domain" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Web Template <span className="text-gray-400 text-xs">NGINX</span></label>
                <select name="webTemplate" value={formData.webTemplate} onChange={handleChange} className="input">
                  {systemInfo?.webTemplates?.map(tpl => <option key={tpl} value={tpl}>{tpl}</option>) || <option value="default">default</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Backend Template <span className="text-gray-400 text-xs">PHP-FPM</span></label>
                <select name="backendTemplate" value={formData.backendTemplate} onChange={handleChange} className="input">
                  {systemInfo?.backendTemplates?.map(tpl => <option key={tpl} value={tpl}>{tpl}</option>) || <option value="default">default</option>}
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* DNS Section */}
        <Section title="DNS" icon={Globe}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">DNS Template <span className="text-gray-400 text-xs">BIND9</span></label>
              <select name="dnsTemplate" value={formData.dnsTemplate} onChange={handleChange} className="input">
                <option value="default">default</option>
                <option value="child-ns">child-ns</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UnlimitedInput label="DNS Zones" name="dnsDomains" value={formData.dnsDomains} onChange={handleChange} />
              <UnlimitedInput label="DNS Records" name="dnsRecords" value={formData.dnsRecords} onChange={handleChange} suffix="per domain" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Name Servers</label>
              <div className="space-y-2">
                {nameServers.map((ns, index) => (
                  <input key={index} type="text" value={ns} onChange={(e) => updateNameServer(index, e.target.value)} className="input" placeholder={`ns${index + 1}.example.com`} />
                ))}
              </div>
              <button type="button" onClick={addNameServer} className="mt-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">Add Name Server</button>
            </div>
          </div>
        </Section>

        {/* MAIL Section */}
        <Section title="MAIL" icon={Mail}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UnlimitedInput label="Mail Domains" name="mailDomains" value={formData.mailDomains} onChange={handleChange} />
              <UnlimitedInput label="Mail Accounts" name="mailAccounts" value={formData.mailAccounts} onChange={handleChange} suffix="per domain" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rate Limit</label>
              <input type="number" name="rateLimit" value={formData.rateLimit} onChange={handleChange} className="input" placeholder="200" />
              <p className="text-xs text-gray-500 mt-1">per account / hour</p>
            </div>
          </div>
        </Section>

        {/* DB Section */}
        <Section title="DB" icon={Database}>
          <UnlimitedInput label="Databases" name="databases" value={formData.databases} onChange={handleChange} />
        </Section>

        {/* System Section */}
        <Section title="System" icon={HardDrive}>
          <div className="space-y-4">
            <UnlimitedInput label="Cron Jobs" name="cronJobs" value={formData.cronJobs} onChange={handleChange} />
            <div>
              <label className="block text-sm font-medium mb-1">SSH Access</label>
              <select name="shell" value={formData.shell} onChange={handleChange} className="input">
                {systemInfo?.shells?.map(shell => {
                  const shellName = shell.split('/').pop();
                  return <option key={shell} value={shell}>{shellName === 'nologin' ? 'nologin' : shell}</option>;
                }) || (
                  <>
                    <option value="nologin">nologin</option>
                    <option value="/bin/bash">/bin/bash</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </Section>
      </form>
    </div>
  );
}

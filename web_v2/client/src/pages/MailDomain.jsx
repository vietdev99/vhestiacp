import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  ArrowLeft, Mail, Users, Shield, Key, Globe, Copy, Check, Plus, 
  Trash2, RefreshCw, Lock, AlertCircle, CheckCircle, Settings, Save
} from 'lucide-react';

export default function MailDomain() {
  const { domain } = useParams();
  const queryClient = useQueryClient();
  const [copiedRecord, setCopiedRecord] = useState(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ account: '', password: '', quota: 'unlimited' });
  const [activeTab, setActiveTab] = useState('dns');
  const [settings, setSettings] = useState({
    antispam: false,
    antivirus: false,
    dkim: true,
    ssl: false,
    letsencrypt: false,
    rejectSpam: false,
    rateLimit: '200',
    catchall: '',
    webmail: 'snappymail'
  });

  // Fetch domain details
  const { data: domainData, isLoading: domainLoading } = useQuery({
    queryKey: ['mail-domain', domain],
    queryFn: async () => {
      const res = await api.get(`/api/mail/${domain}`);
      return res.data;
    }
  });

  // Fetch mail accounts
  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['mail-accounts', domain],
    queryFn: async () => {
      const res = await api.get(`/api/mail/${domain}/accounts`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Fetch DNS records
  const { data: dnsData, isLoading: dnsLoading } = useQuery({
    queryKey: ['mail-dns-records', domain],
    queryFn: async () => {
      const res = await api.get(`/api/mail/${domain}/dns-records`);
      return res.data;
    }
  });

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (data) => {
      await api.post(`/api/mail/${domain}/accounts`, data);
    },
    onSuccess: () => {
      refetchAccounts();
      setShowAddAccount(false);
      setNewAccount({ account: '', password: '', quota: 'unlimited' });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (account) => {
      await api.delete(`/api/mail/${domain}/accounts/${account}`);
    },
    onSuccess: () => {
      refetchAccounts();
    }
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      await api.put(`/api/mail/${domain}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mail-domain', domain]);
    }
  });

  // Sync settings from domain data
  useEffect(() => {
    if (domainData) {
      setSettings({
        antispam: domainData.ANTISPAM === 'yes',
        antivirus: domainData.ANTIVIRUS === 'yes',
        dkim: domainData.DKIM === 'yes',
        ssl: domainData.SSL === 'yes',
        letsencrypt: false,
        rejectSpam: domainData.REJECT === 'yes',
        rateLimit: domainData.RATE_LIMIT || '200',
        catchall: domainData.CATCHALL || '',
        webmail: domainData.WEBMAIL || 'snappymail'
      });
    }
  }, [domainData]);

  const copyToClipboard = (text, recordId) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordId);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAccount({ ...newAccount, password });
  };

  if (domainLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/mail" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary-600" />
            {domain}
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Mail domain configuration and DNS records
          </p>
        </div>
        <div className="flex items-center gap-2">
          {domainData?.SSL === 'yes' && (
            <span className="badge badge-success flex items-center gap-1">
              <Lock className="w-3 h-3" /> SSL Enabled
            </span>
          )}
        </div>
      </div>

      {/* Domain Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{domainData?.ACCOUNTS || 0}</p>
              <p className="text-sm text-gray-500">Accounts</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{domainData?.ANTISPAM === 'yes' ? 'On' : 'Off'}</p>
              <p className="text-sm text-gray-500">Anti-Spam</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{domainData?.DKIM === 'yes' ? 'On' : 'Off'}</p>
              <p className="text-sm text-gray-500">DKIM</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Globe className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{domainData?.U_DISK || 0} MB</p>
              <p className="text-sm text-gray-500">Disk Usage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Card */}
      <div className="card">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-dark-border">
          <nav className="flex -mb-px">
            {[
              { id: 'dns', name: 'DNS Records', icon: Globe },
              { id: 'accounts', name: 'Mail Accounts', icon: Users },
              { id: 'settings', name: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* DNS Tab */}
        {activeTab === 'dns' && (
          <div>
            <div className="p-4 border-b border-gray-200 dark:border-dark-border">
              <p className="text-sm text-gray-500">
                Add these records to your domain's DNS settings for email to work properly
              </p>
            </div>
            {dnsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-dark-border">
                {dnsData?.records?.map((record, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-border/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            record.type === 'MX' ? 'bg-blue-100 text-blue-700' :
                            record.type === 'A' ? 'bg-green-100 text-green-700' :
                            record.type === 'TXT' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {record.type}
                          </span>
                          <span className="font-mono text-sm font-medium">{record.name}</span>
                          {record.priority && (
                            <span className="text-xs text-gray-500">Priority: {record.priority}</span>
                          )}
                        </div>
                        <div className="bg-gray-100 dark:bg-dark-border p-2 rounded font-mono text-sm break-all">
                          {record.value}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{record.description}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(record.value, index)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border flex-shrink-0"
                        title="Copy value"
                      >
                        {copiedRecord === index ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {dnsData?.serverIP && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-dark-border">
                <p className="text-sm">
                  <strong>Server IP:</strong> {dnsData.serverIP} | 
                  <strong className="ml-2">Hostname:</strong> {dnsData.serverHostname}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div>
            <div className="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
              <p className="text-sm text-gray-500">Manage email accounts for this domain</p>
              <button 
                onClick={() => setShowAddAccount(!showAddAccount)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Account
              </button>
            </div>

            {showAddAccount && (
              <div className="p-4 bg-gray-50 dark:bg-dark-border/30 border-b border-gray-200 dark:border-dark-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Name</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newAccount.account}
                        onChange={(e) => setNewAccount({ ...newAccount, account: e.target.value })}
                        className="input rounded-r-none"
                        placeholder="user"
                      />
                      <span className="px-3 py-2 bg-gray-200 dark:bg-dark-border border border-l-0 border-gray-300 dark:border-dark-border rounded-r-lg text-sm">
                        @{domain}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAccount.password}
                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                        className="input flex-1"
                        placeholder="Password"
                      />
                      <button onClick={generatePassword} className="btn btn-secondary btn-sm">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quota</label>
                    <select
                      value={newAccount.quota}
                      onChange={(e) => setNewAccount({ ...newAccount, quota: e.target.value })}
                      className="input"
                    >
                      <option value="unlimited">Unlimited</option>
                      <option value="100">100 MB</option>
                      <option value="500">500 MB</option>
                      <option value="1000">1 GB</option>
                      <option value="5000">5 GB</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowAddAccount(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button 
                    onClick={() => addAccountMutation.mutate(newAccount)}
                    disabled={!newAccount.account || !newAccount.password || addAccountMutation.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {addAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
                {addAccountMutation.isError && (
                  <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {addAccountMutation.error?.response?.data?.error || 'Failed to create account'}
                  </div>
                )}
              </div>
            )}

            <div className="divide-y divide-gray-200 dark:divide-dark-border">
              {accountsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No mail accounts yet. Create your first account above.
                </div>
              ) : (
                accounts.map((account) => (
                  <div key={account.account} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-border">
                        <Mail className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{account.email}</p>
                        <p className="text-sm text-gray-500">
                          Quota: {account.QUOTA === 'unlimited' ? 'Unlimited' : `${account.QUOTA} MB`} | 
                          Used: {account.U_DISK || 0} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete mail account ${account.email}?`)) {
                          deleteAccountMutation.mutate(account.account);
                        }
                      }}
                      disabled={deleteAccountMutation.isPending}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                      title="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Security</h3>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Anti-Spam</p>
                    <p className="text-sm text-gray-500">Filter incoming spam messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.antispam}
                    onChange={(e) => setSettings({ ...settings, antispam: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Reject Spam</p>
                    <p className="text-sm text-gray-500">Reject spam emails instead of filtering</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.rejectSpam}
                    onChange={(e) => setSettings({ ...settings, rejectSpam: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Anti-Virus</p>
                    <p className="text-sm text-gray-500">Scan emails for viruses</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.antivirus}
                    onChange={(e) => setSettings({ ...settings, antivirus: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">DKIM Support</p>
                    <p className="text-sm text-gray-500">Sign outgoing emails with DKIM</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dkim}
                    onChange={(e) => setSettings({ ...settings, dkim: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Configuration</h3>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">SSL/TLS</p>
                    <p className="text-sm text-gray-500">Enable SSL for mail connections</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ssl}
                    onChange={(e) => setSettings({ ...settings, ssl: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                {settings.ssl && (
                  <label className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ml-4 cursor-pointer">
                    <div>
                      <p className="font-medium">Let's Encrypt</p>
                      <p className="text-sm text-gray-500">Auto-generate SSL certificate</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.letsencrypt}
                      onChange={(e) => setSettings({ ...settings, letsencrypt: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                )}
                <div className="p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg">
                  <p className="font-medium mb-2">Rate Limit</p>
                  <p className="text-sm text-gray-500 mb-2">Emails per hour per account</p>
                  <input
                    type="number"
                    value={settings.rateLimit}
                    onChange={(e) => setSettings({ ...settings, rateLimit: e.target.value })}
                    className="input"
                    placeholder="200"
                  />
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg">
                  <p className="font-medium mb-2">Catch-All Email</p>
                  <p className="text-sm text-gray-500 mb-2">Receive all emails to this address</p>
                  <input
                    type="email"
                    value={settings.catchall}
                    onChange={(e) => setSettings({ ...settings, catchall: e.target.value })}
                    className="input"
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-border/30 rounded-lg">
                  <p className="font-medium mb-2">Webmail Client</p>
                  <p className="text-sm text-gray-500 mb-2">Default webmail application</p>
                  <select
                    value={settings.webmail}
                    onChange={(e) => setSettings({ ...settings, webmail: e.target.value })}
                    className="input"
                  >
                    <option value="snappymail">SnappyMail</option>
                    <option value="roundcube">Roundcube</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
              <div>
                {saveSettingsMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Settings saved successfully
                  </div>
                )}
                {saveSettingsMutation.isError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {saveSettingsMutation.error?.response?.data?.error || 'Failed to save settings'}
                  </div>
                )}
              </div>
              <button
                onClick={() => saveSettingsMutation.mutate(settings)}
                disabled={saveSettingsMutation.isPending}
                className="btn btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

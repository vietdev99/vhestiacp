import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft,
  Save,
  Settings,
  GitBranch,
  Globe,
  Server,
  Database,
  Puzzle,
  Archive,
  RefreshCw,
  Lock,
  Shield,
  Plug,
  ChevronDown,
  ChevronUp,
  Loader2,
  Network,
  PaintBucket,
  Clock,
  Mail,
  Upload,
  Pencil,
  User,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Accordion Section Component
function AccordionSection({ icon: Icon, title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card mb-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary-600" />
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-dark-border p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ServerConfigure() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch server config
  const { data, isLoading, error } = useQuery({
    queryKey: ['server-config'],
    queryFn: async () => {
      const res = await api.get('/api/system/server/config');
      return res.data;
    },
    onSuccess: (data) => {
      // Find first installed PHP as default
      const installedPhp = data?.phpVersions?.find(p => p.installed);
      setFormData({
        hostname: data.hostname,
        timezone: data.timezone,
        theme: data.config?.theme,
        language: data.config?.language,
        debugMode: data.config?.debugMode,
        webmailAlias: data.config?.webmailAlias,
        dbPmaAlias: data.config?.dbPmaAlias,
        dbPgaAlias: data.config?.dbPgaAlias,
        inactiveSessionTimeout: data.config?.inactiveSessionTimeout,
        loginStyle: data.config?.loginStyle,
        api: data.config?.api,
        apiSystem: data.config?.apiSystem,
        policySystemPasswordReset: data.config?.policySystemPasswordReset,
        policyUserChangeTheme: data.config?.policyUserChangeTheme,
        fileManager: data.config?.fileManager,
        webTerminal: data.config?.webTerminal,
        pluginAppInstaller: data.config?.pluginAppInstaller,
        diskQuota: data.config?.diskQuota,
        resourcesLimit: data.config?.resourcesLimit,
        firewallSystem: data.config?.firewallSystem,
        upgradeSendEmail: data.config?.upgradeSendEmail,
        upgradeSendEmailLog: data.config?.upgradeSendEmailLog,
        smtpRelay: data.config?.smtpRelay,
        smtpRelayHost: data.config?.smtpRelayHost,
        smtpRelayPort: data.config?.smtpRelayPort,
        smtpRelayUser: data.config?.smtpRelayUser,
        defaultPhp: installedPhp?.version || '',
        // Backup settings
        backupEnabled: data?.backup?.local ? 'yes' : 'no',
        backupMode: data?.backup?.mode || 'zstd',
        backupGzip: data?.backup?.gzip || '4',
        remoteBackup: !!data?.backup?.remote,
        incrementalBackup: data?.incrementalBackup ? 'yes' : 'no',
        // Security - API
        policyCsrfStrictness: data.config?.policyCsrfStrictness,
        // Security - System Protection
        policySystemProtectedAdmin: data.config?.policySystemProtectedAdmin,
        policySystemHideAdmin: data.config?.policySystemHideAdmin,
        policySystemHideServices: data.config?.policySystemHideServices,
        // Security - Policies
        policyUserEditDetails: data.config?.policyUserEditDetails,
        policyUserEditWebTemplates: data.config?.policyUserEditWebTemplates,
        policyUserEditDnsTemplates: data.config?.policyUserEditDnsTemplates,
        policyUserViewLogs: data.config?.policyUserViewLogs,
        policyUserDeleteLogs: data.config?.policyUserDeleteLogs,
        policyBackupSuspendedUsers: data.config?.policyBackupSuspendedUsers,
        policySyncErrorDocuments: data.config?.policySyncErrorDocuments,
        policySyncSkeleton: data.config?.policySyncSkeleton,
        enforceSubdomainOwnership: data.config?.enforceSubdomainOwnership
      });
    }
  });

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: async ({ field, value }) => {
      await api.put('/api/system/server/config', { field, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['server-config']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update configuration');
    }
  });

  // Toggle feature mutation
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ feature, enabled }) => {
      await api.post('/api/system/server/config/feature', { feature, enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['server-config']);
      toast.success('Feature updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to toggle feature');
    }
  });

  // PHP version management mutation
  const phpMutation = useMutation({
    mutationFn: async ({ version, action }) => {
      await api.post('/api/system/server/config/php', { version, action });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['server-config']);
      toast.success(`PHP ${variables.version} ${variables.action === 'install' ? 'installed' : 'uninstalled'} successfully`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to manage PHP version');
    }
  });

  // Set default PHP mutation
  const defaultPhpMutation = useMutation({
    mutationFn: async ({ version }) => {
      await api.post('/api/system/server/config/default-php', { version });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['server-config']);
      toast.success(`Default PHP version set to ${variables.version}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to set default PHP');
    }
  });

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save changed fields
      const fieldsToSave = [
        'hostname', 'timezone', 'theme', 'language', 'debugMode',
        'webmailAlias', 'dbPmaAlias', 'dbPgaAlias', 'inactiveSessionTimeout', 'loginStyle',
        'api', 'apiSystem', 'policySystemPasswordReset', 'policyUserChangeTheme',
        'upgradeSendEmail', 'upgradeSendEmailLog',
        'backupMode', 'backupGzip',
        'policyCsrfStrictness',
        'policySystemProtectedAdmin', 'policySystemHideAdmin', 'policySystemHideServices',
        'policyUserEditDetails', 'policyUserEditWebTemplates', 'policyUserEditDnsTemplates',
        'policyUserViewLogs', 'policyUserDeleteLogs', 'policyBackupSuspendedUsers',
        'policySyncErrorDocuments', 'policySyncSkeleton', 'enforceSubdomainOwnership'
      ];

      for (const field of fieldsToSave) {
        const originalValue = field === 'hostname' ? data?.hostname :
          field === 'timezone' ? data?.timezone :
          field === 'backupMode' ? data?.backup?.mode :
          field === 'backupGzip' ? data?.backup?.gzip :
          data?.config?.[field];

        if (formData[field] !== undefined && formData[field] !== originalValue) {
          await updateMutation.mutateAsync({ field, value: formData[field] });
        }
      }

      toast.success('Configuration saved successfully');
      queryClient.invalidateQueries(['server-config']);
    } catch (error) {
      // Error already handled in mutation
    } finally {
      setSaving(false);
    }
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
        <p className="text-red-500">Failed to load server configuration</p>
      </div>
    );
  }

  const config = data?.config || {};

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/server-services" className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <Link to="/admin/ip" className="btn btn-secondary">
            <Network className="w-4 h-4 mr-2" />
            Network
          </Link>
          <Link to="/admin/whitelabel" className="btn btn-secondary">
            <PaintBucket className="w-4 h-4 mr-2" />
            White Label
          </Link>
          <Link to="/admin/panel-cronjobs" className="btn btn-secondary">
            <Clock className="w-4 h-4 mr-2" />
            Panel Cronjobs
          </Link>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Configure Server</h1>

      {/* Basic Options */}
      <AccordionSection icon={Settings} title="Basic Options" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <label className="form-label">Hostname</label>
            <input
              type="text"
              className="form-input w-full"
              value={formData.hostname || ''}
              onChange={(e) => handleFieldChange('hostname', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Time Zone</label>
            <select
              className="form-select w-full"
              value={formData.timezone || ''}
              onChange={(e) => handleFieldChange('timezone', e.target.value)}
            >
              {(data?.timezones || []).map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="debugMode"
              className="form-checkbox"
              checked={formData.debugMode || false}
              onChange={(e) => handleFieldChange('debugMode', e.target.checked)}
            />
            <label htmlFor="debugMode">Enable debug mode</label>
          </div>
        </div>
      </AccordionSection>

      {/* Updates */}
      <AccordionSection icon={GitBranch} title="Updates">
        <div className="space-y-4">
          <p className="text-sm">
            <span className="text-gray-500">Version:</span>{' '}
            <span className="font-medium">{config.version}</span>
          </p>
          {config.releaseBranch !== 'release' && (
            <p className="text-sm">
              <span className="text-gray-500">Release:</span>{' '}
              <span className="font-medium">{config.releaseBranch}</span>
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="upgradeSendEmail"
              className="form-checkbox"
              checked={formData.upgradeSendEmail || false}
              onChange={(e) => handleFieldChange('upgradeSendEmail', e.target.checked)}
            />
            <label htmlFor="upgradeSendEmail">Send email notification when an update has been installed</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="upgradeSendEmailLog"
              className="form-checkbox"
              checked={formData.upgradeSendEmailLog || false}
              onChange={(e) => handleFieldChange('upgradeSendEmailLog', e.target.checked)}
            />
            <label htmlFor="upgradeSendEmailLog">Include update log in notification email</label>
          </div>
        </div>
      </AccordionSection>

      {/* Web Server */}
      <AccordionSection icon={Globe} title="Web Server">
        <div className="space-y-4">
          {/* Web Server and PHP Interpreter info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Web Server:</span>
              <span className="font-medium text-amber-600">{config.webSystem || 'nginx'}</span>
              <Link to="/server-services/nginx/edit" className="text-amber-500 hover:text-amber-600">
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">PHP Interpreter:</span>
              <span className="font-medium text-amber-600">{config.webBackend || 'php-fpm'}</span>
              <Link to="/server-services/php-fpm/edit" className="text-amber-500 hover:text-amber-600">
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Enabled PHP Versions title */}
          <div className="mt-4">
            <h4 className="font-medium text-sm">Enabled PHP Versions</h4>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              It may take a few minutes to save your changes. Please wait until the process has completed and do not refresh the page.
            </p>
          </div>

          {/* PHP Versions list */}
          {data?.phpVersions?.length > 0 && (
            <div className="space-y-1">
              {data.phpVersions.map(php => {
                const isProcessing = phpMutation.isPending && phpMutation.variables?.version === php.version;
                return (
                  <div key={php.version}>
                    <label className={clsx(
                      'flex items-center gap-2 cursor-pointer py-1',
                      isProcessing && 'opacity-50 cursor-wait'
                    )}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      ) : (
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={php.installed}
                          onChange={(e) => {
                            phpMutation.mutate({
                              version: php.version,
                              action: e.target.checked ? 'install' : 'uninstall'
                            });
                          }}
                          disabled={phpMutation.isPending}
                        />
                      )}
                      <span className={clsx(
                        'text-sm font-medium',
                        php.installed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-dark-muted'
                      )}>
                        php-{php.version}
                      </span>
                    </label>
                    {/* Domains using this PHP version */}
                    {php.installed && php.domains && php.domains.length > 0 && (
                      <div className="ml-6 pl-4 border-l-2 border-gray-200 dark:border-dark-border space-y-1 py-1">
                        {php.domains.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-primary-600 dark:text-primary-400">{item.user}</span>
                            <span>{item.domain}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* System PHP Version selector */}
          {data?.phpVersions?.some(p => p.installed) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
              <label className="form-label">System PHP Version</label>
              <div className="flex items-center gap-2">
                <select
                  className="form-select flex-1"
                  value={formData.defaultPhp || data?.systemPhp || ''}
                  onChange={(e) => handleFieldChange('defaultPhp', e.target.value)}
                >
                  {data.phpVersions.filter(p => p.installed).map(php => (
                    <option key={php.version} value={php.version}>php-{php.version}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => formData.defaultPhp && defaultPhpMutation.mutate({ version: formData.defaultPhp })}
                  disabled={defaultPhpMutation.isPending || !formData.defaultPhp}
                >
                  {defaultPhpMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Set Default'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* DNS Server */}
      <AccordionSection icon={Server} title="DNS Server">
        <div className="space-y-2">
          <div>
            <span className="text-gray-500 text-sm">DNS System:</span>
            <p className="font-medium">{config.dnsSystem || 'none'}</p>
          </div>
        </div>
      </AccordionSection>

      {/* Mail Server */}
      {config.mailSystem && (
        <AccordionSection icon={Mail} title="Mail Server">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 text-sm">Mail System:</span>
                <p className="font-medium">{config.mailSystem || 'none'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Antivirus:</span>
                <p className="font-medium">{config.antivirusSystem || 'none'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">AntiSpam:</span>
                <p className="font-medium">{config.antispamSystem || 'none'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Webmail:</span>
                <p className="font-medium">{config.webmailSystem || 'none'}</p>
              </div>
            </div>
            <div>
              <label className="form-label">Webmail URL</label>
              <input
                type="text"
                className="form-input w-full"
                value={formData.webmailAlias || ''}
                onChange={(e) => handleFieldChange('webmailAlias', e.target.value)}
                placeholder="webmail"
              />
              <p className="text-xs text-gray-400 mt-1">Access webmail at: https://hostname/webmail-url</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="smtpRelay"
                className="form-checkbox"
                checked={formData.smtpRelay || false}
                onChange={(e) => handleFieldChange('smtpRelay', e.target.checked)}
              />
              <label htmlFor="smtpRelay">Enable SMTP Relay</label>
            </div>
            {formData.smtpRelay && (
              <div className="ml-6 space-y-3 p-3 bg-gray-50 dark:bg-dark-border rounded">
                <div>
                  <label className="form-label">SMTP Relay Host</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={formData.smtpRelayHost || ''}
                    onChange={(e) => handleFieldChange('smtpRelayHost', e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Port</label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={formData.smtpRelayPort || ''}
                      onChange={(e) => handleFieldChange('smtpRelayPort', e.target.value)}
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={formData.smtpRelayUser || ''}
                      onChange={(e) => handleFieldChange('smtpRelayUser', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* FTP Server */}
      {config.ftpSystem && (
        <AccordionSection icon={Upload} title="FTP Server">
          <div className="space-y-2">
            <div>
              <span className="text-gray-500 text-sm">FTP System:</span>
              <p className="font-medium">{config.ftpSystem || 'none'}</p>
            </div>
          </div>
        </AccordionSection>
      )}

      {/* Databases */}
      <AccordionSection icon={Database} title="Databases">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500 text-sm">MySQL:</span>
              <p className="font-medium">{data?.mysql?.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">PostgreSQL:</span>
              <p className="font-medium">{data?.pgsql?.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          {data?.mysql?.enabled && (
            <div>
              <label className="form-label">phpMyAdmin URL</label>
              <input
                type="text"
                className="form-input w-full"
                value={formData.dbPmaAlias || ''}
                onChange={(e) => handleFieldChange('dbPmaAlias', e.target.value)}
                placeholder="phpmyadmin"
              />
            </div>
          )}
          {data?.pgsql?.enabled && (
            <div>
              <label className="form-label">phpPgAdmin URL</label>
              <input
                type="text"
                className="form-input w-full"
                value={formData.dbPgaAlias || ''}
                onChange={(e) => handleFieldChange('dbPgaAlias', e.target.value)}
                placeholder="phppgadmin"
              />
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Backups */}
      <AccordionSection icon={Archive} title="Backups">
        <div className="space-y-4">
          <div>
            <label className="form-label">Local Backup</label>
            <select
              className="form-select w-full"
              value={formData.backupEnabled || 'yes'}
              onChange={(e) => handleFieldChange('backupEnabled', e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">Compression</label>
            <select
              className="form-select w-full"
              value={formData.backupMode || 'zstd'}
              onChange={(e) => handleFieldChange('backupMode', e.target.value)}
            >
              <option value="gzip">gzip</option>
              <option value="zstd">zstd</option>
            </select>
          </div>
          <div>
            <label className="form-label">Compression Level</label>
            <select
              className="form-select w-full"
              value={formData.backupGzip || '4'}
              onChange={(e) => handleFieldChange('backupGzip', e.target.value)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Directory</label>
            <input
              type="text"
              className="form-input w-full bg-gray-100 dark:bg-dark-border"
              value={data?.backup?.directory || '/backup'}
              readOnly
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remoteBackup"
              className="form-checkbox"
              checked={formData.remoteBackup || false}
              onChange={(e) => handleFieldChange('remoteBackup', e.target.checked)}
            />
            <label htmlFor="remoteBackup">Remote Backup</label>
          </div>
        </div>
      </AccordionSection>

      {/* Incremental Backups */}
      <AccordionSection icon={RefreshCw} title="Incremental Backups">
        <div className="space-y-4">
          <div>
            <label className="form-label">Enable incremental backup</label>
            <select
              className="form-select w-full"
              value={formData.incrementalBackup || 'no'}
              onChange={(e) => handleFieldChange('incrementalBackup', e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </AccordionSection>

      {/* SSL */}
      <AccordionSection icon={Lock} title="SSL">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">SSL Certificate</span>
            <button className="text-primary-600 hover:text-primary-700 text-sm">
              Generate Self-Signed SSL Certificate
            </button>
          </div>
          <div>
            <textarea
              className="form-textarea w-full font-mono text-xs"
              rows={6}
              value={data?.ssl?.CRT || ''}
              readOnly
              placeholder="-----BEGIN CERTIFICATE-----"
            />
          </div>
          <div>
            <label className="form-label">SSL Private Key</label>
            <textarea
              className="form-textarea w-full font-mono text-xs"
              rows={6}
              value={data?.ssl?.KEY || ''}
              readOnly
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
          {data?.ssl?.SUBJECT && (
            <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 dark:border-dark-border pt-4">
              <div>
                <span className="text-gray-500">Issued To:</span>
                <p className="font-medium">{data.ssl.SUBJECT}</p>
              </div>
              <div>
                <span className="text-gray-500">Not Before:</span>
                <p className="font-medium">{data.ssl.NOT_BEFORE}</p>
              </div>
              <div>
                <span className="text-gray-500">Not After:</span>
                <p className="font-medium">{data.ssl.NOT_AFTER}</p>
              </div>
              <div>
                <span className="text-gray-500">Signature:</span>
                <p className="font-medium">{data.ssl.SIGNATURE || 'sha256WithRSAEncryption'}</p>
              </div>
              <div>
                <span className="text-gray-500">Key Size:</span>
                <p className="font-medium">{data.ssl.KEY_SIZE || '4096'} bit</p>
              </div>
              <div>
                <span className="text-gray-500">Issued By:</span>
                <p className="font-medium">{data.ssl.ISSUER}</p>
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Security */}
      <AccordionSection icon={Shield} title="Security">
        <div className="space-y-6">
          {/* System */}
          <div className="border-b border-gray-200 dark:border-dark-border pb-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span>System</span>
              <span className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-sm"></span>
            </h3>
          </div>

          {/* API Section */}
          <div className="space-y-4">
            <h4 className="font-medium">API</h4>
            <div>
              <label className="form-label">Enable API access</label>
              <select
                className="form-select w-full"
                value={formData.api || 'no'}
                onChange={(e) => handleFieldChange('api', e.target.value)}
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </div>
            <div>
              <label className="form-label">Enable legacy API access</label>
              <select
                className="form-select w-full"
                value={formData.apiSystem || '0'}
                onChange={(e) => handleFieldChange('apiSystem', e.target.value)}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          {/* Login Section */}
          <div className="space-y-4 border-t border-gray-200 dark:border-dark-border pt-4">
            <h4 className="font-medium">Login</h4>
            <div>
              <label className="form-label">Login screen style</label>
              <select
                className="form-select w-full"
                value={formData.loginStyle || 'default'}
                onChange={(e) => handleFieldChange('loginStyle', e.target.value)}
              >
                <option value="default">Default</option>
                <option value="old">Classic</option>
              </select>
            </div>
            <div>
              <label className="form-label">Allow users to reset their passwords</label>
              <select
                className="form-select w-full"
                value={formData.policySystemPasswordReset || 'yes'}
                onChange={(e) => handleFieldChange('policySystemPasswordReset', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Inactive session timeout (Minutes)</label>
              <input
                type="number"
                className="form-input w-full"
                value={formData.inactiveSessionTimeout || '60'}
                onChange={(e) => handleFieldChange('inactiveSessionTimeout', e.target.value)}
                min="1"
              />
            </div>
            <div>
              <label className="form-label">Prevent CSRF</label>
              <select
                className="form-select w-full"
                value={formData.policyCsrfStrictness || '1'}
                onChange={(e) => handleFieldChange('policyCsrfStrictness', e.target.value)}
              >
                <option value="1">Enabled</option>
                <option value="0">Disabled</option>
              </select>
            </div>
          </div>

          {/* System Protection Section */}
          <div className="space-y-4 border-t border-gray-200 dark:border-dark-border pt-4">
            <h3 className="font-medium flex items-center gap-2">
              <span>System Protection</span>
              <span className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-sm"></span>
            </h3>
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">System Administrator account</h4>
            <div>
              <label className="form-label">Restrict access to read-only for other administrators</label>
              <select
                className="form-select w-full"
                value={formData.policySystemProtectedAdmin || 'no'}
                onChange={(e) => handleFieldChange('policySystemProtectedAdmin', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Hide account from other administrators</label>
              <select
                className="form-select w-full"
                value={formData.policySystemHideAdmin || 'no'}
                onChange={(e) => handleFieldChange('policySystemHideAdmin', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Do not allow other administrators to access Server Settings</label>
              <select
                className="form-select w-full"
                value={formData.policySystemHideServices || 'no'}
                onChange={(e) => handleFieldChange('policySystemHideServices', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {/* Policies Section */}
          <div className="space-y-4 border-t border-gray-200 dark:border-dark-border pt-4">
            <h3 className="font-medium flex items-center gap-2">
              <span>Policies</span>
              <span className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-sm"></span>
            </h3>
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Users</h4>
            <div>
              <label className="form-label">Allow users to edit their account details</label>
              <select
                className="form-select w-full"
                value={formData.policyUserEditDetails || 'yes'}
                onChange={(e) => handleFieldChange('policyUserEditDetails', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Allow users to change templates when editing web domains</label>
              <select
                className="form-select w-full"
                value={formData.policyUserEditWebTemplates || 'yes'}
                onChange={(e) => handleFieldChange('policyUserEditWebTemplates', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Allow users to change templates when editing DNS zones</label>
              <select
                className="form-select w-full"
                value={formData.policyUserEditDnsTemplates || 'yes'}
                onChange={(e) => handleFieldChange('policyUserEditDnsTemplates', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Allow users to view action and login history logs</label>
              <select
                className="form-select w-full"
                value={formData.policyUserViewLogs || 'yes'}
                onChange={(e) => handleFieldChange('policyUserViewLogs', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Allow users to delete log history</label>
              <select
                className="form-select w-full"
                value={formData.policyUserDeleteLogs || 'yes'}
                onChange={(e) => handleFieldChange('policyUserDeleteLogs', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Allow suspended users to create new backups</label>
              <select
                className="form-select w-full"
                value={formData.policyBackupSuspendedUsers || 'no'}
                onChange={(e) => handleFieldChange('policyBackupSuspendedUsers', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Sync Error document templates on user rebuild</label>
              <select
                className="form-select w-full"
                value={formData.policySyncErrorDocuments || 'yes'}
                onChange={(e) => handleFieldChange('policySyncErrorDocuments', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label">Sync Skeleton templates</label>
              <select
                className="form-select w-full"
                value={formData.policySyncSkeleton || 'yes'}
                onChange={(e) => handleFieldChange('policySyncSkeleton', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mt-4">Domains</h4>
            <div>
              <label className="form-label">Enforce subdomain ownership</label>
              <select
                className="form-select w-full"
                value={formData.enforceSubdomainOwnership || 'yes'}
                onChange={(e) => handleFieldChange('enforceSubdomainOwnership', e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Plugins */}
      <AccordionSection icon={Plug} title="Plugins">
        <div className="space-y-4">
          <div>
            <label className="form-label">Quick App Installer</label>
            <select
              className="form-select w-full"
              value={config.pluginAppInstaller ? 'yes' : 'no'}
              onChange={(e) => handleFieldChange('pluginAppInstaller', e.target.value === 'yes')}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">File Manager</label>
            <select
              className="form-select w-full"
              value={config.fileManager ? 'yes' : 'no'}
              onChange={(e) => toggleFeatureMutation.mutate({ feature: 'filemanager', enabled: e.target.value === 'yes' })}
              disabled={toggleFeatureMutation.isPending}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">Web Terminal</label>
            <select
              className="form-select w-full"
              value={config.webTerminal ? 'yes' : 'no'}
              onChange={(e) => toggleFeatureMutation.mutate({ feature: 'webTerminal', enabled: e.target.value === 'yes' })}
              disabled={toggleFeatureMutation.isPending}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">Limit System Resources</label>
            <select
              className="form-select w-full"
              value={config.resourcesLimit === 'yes' ? 'yes' : 'no'}
              onChange={(e) => toggleFeatureMutation.mutate({ feature: 'cgroups', enabled: e.target.value === 'yes' })}
              disabled={toggleFeatureMutation.isPending}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">File System Disk Quota</label>
            <select
              className="form-select w-full"
              value={config.diskQuota === 'yes' ? 'yes' : 'no'}
              onChange={(e) => toggleFeatureMutation.mutate({ feature: 'quota', enabled: e.target.value === 'yes' })}
              disabled={toggleFeatureMutation.isPending}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="form-label">Firewall</label>
            <select
              className="form-select w-full"
              value={config.firewallSystem === 'iptables' ? 'yes' : 'no'}
              onChange={(e) => toggleFeatureMutation.mutate({ feature: 'firewall', enabled: e.target.value === 'yes' })}
              disabled={toggleFeatureMutation.isPending}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

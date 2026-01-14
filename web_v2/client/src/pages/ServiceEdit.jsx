import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Loader2,
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Service-specific basic settings definitions
const SERVICE_SETTINGS = {
  nginx: {
    title: 'NGINX',
    fields: [
      { key: 'worker_processes', label: 'worker_processes', type: 'text' },
      { key: 'worker_connections', label: 'worker_connections', type: 'text' },
      { key: 'client_max_body_size', label: 'client_max_body_size', type: 'text' },
      { key: 'send_timeout', label: 'send_timeout', type: 'text' },
      { key: 'proxy_connect_timeout', label: 'proxy_connect_timeout', type: 'text' },
      { key: 'proxy_send_timeout', label: 'proxy_send_timeout', type: 'text' },
      { key: 'proxy_read_timeout', label: 'proxy_read_timeout', type: 'text' },
      { key: 'gzip', label: 'gzip', type: 'text' },
      { key: 'gzip_comp_level', label: 'gzip_comp_level', type: 'text' },
      { key: 'charset', label: 'charset', type: 'text' }
    ]
  },
  'php-fpm': {
    title: 'PHP-FPM',
    fields: [
      { key: 'max_execution_time', label: 'max_execution_time', type: 'text' },
      { key: 'max_input_time', label: 'max_input_time', type: 'text' },
      { key: 'memory_limit', label: 'memory_limit', type: 'text' },
      { key: 'error_reporting', label: 'error_reporting', type: 'text' },
      { key: 'display_errors', label: 'display_errors', type: 'text' },
      { key: 'post_max_size', label: 'post_max_size', type: 'text' },
      { key: 'upload_max_filesize', label: 'upload_max_filesize', type: 'text' }
    ]
  },
  mysql: {
    title: 'MySQL/MariaDB',
    fields: [
      { key: 'max_connections', label: 'max_connections', type: 'text' },
      { key: 'max_user_connections', label: 'max_user_connections', type: 'text' },
      { key: 'wait_timeout', label: 'wait_timeout', type: 'text' },
      { key: 'interactive_timeout', label: 'interactive_timeout', type: 'text' },
      { key: 'max_allowed_packet', label: 'max_allowed_packet', type: 'text' }
    ]
  },
  mariadb: {
    title: 'MariaDB',
    fields: [
      { key: 'max_connections', label: 'max_connections', type: 'text' },
      { key: 'max_user_connections', label: 'max_user_connections', type: 'text' },
      { key: 'wait_timeout', label: 'wait_timeout', type: 'text' },
      { key: 'interactive_timeout', label: 'interactive_timeout', type: 'text' },
      { key: 'max_allowed_packet', label: 'max_allowed_packet', type: 'text' }
    ]
  }
};

export default function ServiceEdit() {
  const { name } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState('');
  const [settings, setSettings] = useState({});
  const [restartAfterSave, setRestartAfterSave] = useState(true);

  // Fetch service config
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['service-config', name],
    queryFn: async () => {
      const res = await api.get(`/api/system/server/services/${name}/config`);
      return res.data;
    }
  });

  // Update local state when data loads
  useEffect(() => {
    if (data) {
      setConfig(data.config || '');
      setSettings(data.settings || {});
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/api/system/server/services/${name}/config`, {
        config,
        restart: restartAfterSave
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-config', name]);
      queryClient.invalidateQueries(['server-services']);
      toast.success(`Configuration for ${name} saved successfully`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || `Failed to save configuration`);
    }
  });

  // Restart mutation
  const restartMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/system/server/services/${name}/restart`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['server-services']);
      toast.success(`Service ${name} restarted successfully`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || `Failed to restart service`);
    }
  });

  const serviceConfig = SERVICE_SETTINGS[name];
  const hasBasicSettings = serviceConfig && data?.type === 'basic-advanced';

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
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">Failed to load service configuration</p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/server-services"
            className="btn btn-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Configure: {serviceConfig?.title || name.toUpperCase()}</h1>
            {data?.configPath && (
              <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
                {data.configPath}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="btn btn-secondary"
          >
            {restartMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Restart
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn btn-primary"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="card">
        {/* Basic Settings (for services that have them) */}
        {hasBasicSettings && !showAdvanced && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Basic Options
              </h2>
              <button
                onClick={() => setShowAdvanced(true)}
                className="btn btn-secondary btn-sm"
              >
                Advanced Options
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceConfig.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1" htmlFor={field.key}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    id={field.key}
                    value={settings[field.key] || ''}
                    onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings / Config Editor */}
        {(!hasBasicSettings || showAdvanced) && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {hasBasicSettings ? 'Advanced Options' : 'Configuration'}
              </h2>
              {hasBasicSettings && (
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Basic Options
                </button>
              )}
            </div>

            {data?.configPath && (
              <p className="text-sm text-gray-500 dark:text-dark-muted mb-3">
                Editing: {data.configPath}
              </p>
            )}

            <textarea
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              className="form-input w-full font-mono text-sm"
              rows={25}
              spellCheck={false}
            />
          </div>
        )}

        {/* Options section for services with dual config */}
        {data?.optionsPath && data?.options && (
          <div className="p-6 border-t border-gray-200 dark:border-dark-border">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              Options
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-muted mb-3">
              {data.optionsPath}
            </p>
            <textarea
              value={data.options}
              readOnly
              className="form-input w-full font-mono text-sm bg-gray-50 dark:bg-dark-border"
              rows={10}
            />
          </div>
        )}

        {/* Restart checkbox */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={restartAfterSave}
              onChange={(e) => setRestartAfterSave(e.target.checked)}
              className="form-checkbox"
            />
            <span>Restart service after saving</span>
          </label>
        </div>
      </div>
    </div>
  );
}

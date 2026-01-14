import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft, Save, RefreshCw, FileText, AlertTriangle, Check, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HAProxyConfig() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['haproxy-config-raw'],
    queryFn: async () => {
      const res = await api.get('/api/haproxy/config/raw');
      return res.data;
    }
  });

  useEffect(() => {
    if (data?.config) {
      setConfig(data.config);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig) => {
      const res = await api.put('/api/haproxy/config/raw', { config: newConfig });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['haproxy']);
      queryClient.invalidateQueries(['haproxy-config-raw']);
      setHasChanges(false);
      if (data.restarted) {
        toast.success('Configuration saved and HAProxy restarted');
      } else {
        toast.success('Configuration saved');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save configuration');
    }
  });

  const validateMutation = useMutation({
    mutationFn: async (configToValidate) => {
      const res = await api.post('/api/haproxy/config/validate', { config: configToValidate });
      return res.data;
    },
    onSuccess: (data) => {
      setValidationResult(data);
      if (data.valid) {
        toast.success('Configuration is valid');
      } else {
        toast.error('Configuration has errors');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Validation failed');
    }
  });

  const handleConfigChange = (e) => {
    setConfig(e.target.value);
    setHasChanges(true);
    setValidationResult(null);
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleValidate = () => {
    validateMutation.mutate(config);
  };

  const handleReset = () => {
    if (data?.config) {
      setConfig(data.config);
      setHasChanges(false);
      setValidationResult(null);
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
      <div className="card p-6 text-center text-red-600">
        Failed to load configuration. Please try again.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Link to="/haproxy" className="btn btn-secondary px-3 py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            HAProxy Configuration
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <X className="w-4 h-4 mr-1" />
            Reset
          </button>
          <button
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            className="btn btn-secondary px-3 py-1.5 text-sm"
          >
            <Check className={`w-4 h-4 mr-1 ${validateMutation.isPending ? 'animate-pulse' : ''}`} />
            {validateMutation.isPending ? 'Validating...' : 'Validate'}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="btn btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <Save className={`w-4 h-4 mr-1 ${saveMutation.isPending ? 'animate-spin' : ''}`} />
            {saveMutation.isPending ? 'Saving...' : 'Save & Restart'}
          </button>
        </div>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`mb-4 p-3 rounded-lg ${validationResult.valid ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
          <div className="flex items-center gap-2 font-medium">
            {validationResult.valid ? (
              <>
                <Check className="w-5 h-5" />
                Configuration is valid
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                Configuration has errors
              </>
            )}
          </div>
          {validationResult.output && (
            <pre className="mt-2 text-sm whitespace-pre-wrap font-mono">
              {validationResult.output}
            </pre>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 card overflow-hidden">
        <div className="p-2 bg-gray-100 dark:bg-dark-border border-b border-gray-200 dark:border-dark-border flex items-center gap-2 text-sm text-gray-500 dark:text-dark-muted">
          <FileText className="w-4 h-4" />
          /etc/haproxy/haproxy.cfg
        </div>
        <textarea
          value={config}
          onChange={handleConfigChange}
          className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
          spellCheck={false}
          style={{ minHeight: 'calc(100% - 40px)' }}
        />
      </div>

      {/* Footer info */}
      <div className="mt-2 text-sm text-gray-500 dark:text-dark-muted">
        Line count: {config.split('\n').length} • Size: {(new Blob([config]).size / 1024).toFixed(2)} KB
      </div>
    </div>
  );
}

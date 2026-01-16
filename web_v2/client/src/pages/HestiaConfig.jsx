import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HestiaConfig() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch hestia.conf
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hestia-config'],
    queryFn: async () => {
      const res = await api.get('/api/system/hestia-config');
      return res.data;
    }
  });

  // Initialize config when data loads
  useEffect(() => {
    if (data?.content) {
      setConfig(data.content);
      setHasChanges(false);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (content) => {
      await api.post('/api/system/hestia-config', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hestia-config']);
      setHasChanges(false);
      toast.success('Configuration saved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save configuration');
    }
  });

  // Restart HestiaCP mutation
  const restartMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/system/restart-hestia');
    },
    onSuccess: () => {
      toast.success('HestiaCP is restarting...');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to restart HestiaCP');
    }
  });

  // Handle config change
  const handleChange = (e) => {
    setConfig(e.target.value);
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    saveMutation.mutate(config);
  };

  // Handle save and restart
  const handleSaveAndRestart = async () => {
    try {
      await saveMutation.mutateAsync(config);
      restartMutation.mutate();
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Reset to original
  const handleReset = () => {
    if (data?.content) {
      setConfig(data.content);
      setHasChanges(false);
    }
  };

  if (error) {
    return (
      <div className="card p-6 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Configuration</h2>
        <p className="text-gray-500 dark:text-dark-muted mb-4">
          {error.response?.data?.error || 'Failed to load hestia.conf'}
        </p>
        <button onClick={() => refetch()} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">HestiaCP Configuration</h1>
            <p className="text-gray-500 dark:text-dark-muted text-sm">
              Edit hestia.conf file directly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="btn btn-secondary"
              title="Reset changes"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="btn btn-secondary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleSaveAndRestart}
            disabled={!hasChanges || saveMutation.isPending || restartMutation.isPending}
            className="btn btn-primary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
            Save & Restart
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="card p-4 mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Warning:</strong> Modifying this file incorrectly may cause HestiaCP to malfunction.
            Make sure you know what you're doing before making changes.
            After saving, you need to restart HestiaCP for changes to take effect.
          </div>
        </div>
      </div>

      {/* File path */}
      <div className="card p-3 mb-4 flex items-center gap-2 text-sm">
        <FileText className="w-4 h-4 text-gray-500" />
        <span className="text-gray-500 dark:text-dark-muted">Path:</span>
        <code className="px-2 py-1 bg-gray-100 dark:bg-dark-border rounded text-xs">
          /usr/local/hestia/conf/hestia.conf
        </code>
        {hasChanges && (
          <span className="ml-auto text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            Unsaved changes
          </span>
        )}
        {!hasChanges && data?.content && (
          <span className="ml-auto text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <textarea
            value={config}
            onChange={handleChange}
            className="w-full h-[600px] font-mono text-sm p-4 bg-gray-900 text-gray-100 rounded-lg border-0 focus:ring-2 focus:ring-primary-500"
            spellCheck={false}
            placeholder="# HestiaCP Configuration File"
          />
        )}
      </div>

      {/* Help section */}
      <div className="mt-4 card p-4">
        <h3 className="font-semibold mb-2">Common Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-dark-muted">
          <div>
            <code className="text-xs bg-gray-100 dark:bg-dark-border px-1 rounded">FILE_MANAGER='yes'</code>
            <span className="ml-2">Enable/disable File Manager</span>
          </div>
          <div>
            <code className="text-xs bg-gray-100 dark:bg-dark-border px-1 rounded">WEB_TERMINAL='yes'</code>
            <span className="ml-2">Enable/disable Web Terminal</span>
          </div>
          <div>
            <code className="text-xs bg-gray-100 dark:bg-dark-border px-1 rounded">DEBUG_MODE='false'</code>
            <span className="ml-2">Enable/disable Debug Mode</span>
          </div>
          <div>
            <code className="text-xs bg-gray-100 dark:bg-dark-border px-1 rounded">BACKUP_SYSTEM='local'</code>
            <span className="ml-2">Backup storage type</span>
          </div>
        </div>
      </div>
    </div>
  );
}

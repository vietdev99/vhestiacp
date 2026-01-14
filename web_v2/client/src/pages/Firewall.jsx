import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Shield,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  List,
  Terminal,
  ChevronDown,
  ChevronUp,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Firewall() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('config'); // 'config', 'iptables', 'combined'
  const [showRaw, setShowRaw] = useState(false);

  // Fetch firewall rules (config)
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['firewall'],
    queryFn: async () => {
      const res = await api.get('/api/firewall');
      return res.data;
    }
  });

  // Fetch iptables rules (actual)
  const { data: iptablesData, isLoading: iptablesLoading, refetch: refetchIptables } = useQuery({
    queryKey: ['firewall-iptables'],
    queryFn: async () => {
      const res = await api.get('/api/firewall/iptables');
      return res.data;
    },
    enabled: viewMode === 'iptables' || viewMode === 'combined'
  });

  // Fetch combined data
  const { data: combinedData, isLoading: combinedLoading, refetch: refetchCombined } = useQuery({
    queryKey: ['firewall-combined'],
    queryFn: async () => {
      const res = await api.get('/api/firewall/combined');
      return res.data;
    },
    enabled: viewMode === 'combined'
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/firewall/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['firewall']);
      toast.success('Firewall rule deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete rule');
    }
  });

  // Suspend/unsuspend mutation
  const toggleSuspendMutation = useMutation({
    mutationFn: async ({ id, suspended }) => {
      if (suspended) {
        await api.post(`/api/firewall/${id}/unsuspend`);
      } else {
        await api.post(`/api/firewall/${id}/suspend`);
      }
    },
    onSuccess: (_, { suspended }) => {
      queryClient.invalidateQueries(['firewall']);
      toast.success(suspended ? 'Rule unsuspended' : 'Rule suspended');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to toggle rule');
    }
  });

  // Apply firewall mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/firewall/update');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['firewall']);
      queryClient.invalidateQueries(['firewall-iptables']);
      queryClient.invalidateQueries(['firewall-combined']);
      toast.success('Firewall rules applied');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to apply rules');
    }
  });

  const handleRefresh = () => {
    refetchConfig();
    if (viewMode === 'iptables') refetchIptables();
    if (viewMode === 'combined') refetchCombined();
  };

  const isLoading = configLoading || (viewMode === 'iptables' && iptablesLoading) || (viewMode === 'combined' && combinedLoading);
  const rules = configData?.rules || [];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7" />
            Firewall Rules
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage iptables firewall rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => applyMutation.mutate()}
            className="btn btn-secondary"
            disabled={applyMutation.isPending}
          >
            <Terminal className={`w-4 h-4 mr-2 ${applyMutation.isPending ? 'animate-spin' : ''}`} />
            Apply Rules
          </button>
          <Link to="/firewall/add" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Link>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('config')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'config'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
          }`}
        >
          <List className="w-4 h-4 inline mr-2" />
          Config Rules
        </button>
        <button
          onClick={() => setViewMode('iptables')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'iptables'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
          }`}
        >
          <Terminal className="w-4 h-4 inline mr-2" />
          Live iptables
        </button>
        <button
          onClick={() => setViewMode('combined')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'combined'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Combined View
        </button>
      </div>

      {/* Quick Links */}
      <div className="flex gap-2 mb-6">
        <Link
          to="/firewall/banlist"
          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <Ban className="w-4 h-4" />
          Banned IPs
        </Link>
        <Link
          to="/firewall/ipset"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <List className="w-4 h-4" />
          IPset Lists
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Config Rules View */}
          {viewMode === 'config' && (
            <ConfigRulesTable
              rules={rules}
              onDelete={(id) => {
                if (confirm('Are you sure you want to delete this rule?')) {
                  deleteMutation.mutate(id);
                }
              }}
              onToggleSuspend={(id, suspended) => toggleSuspendMutation.mutate({ id, suspended })}
            />
          )}

          {/* Live iptables View */}
          {viewMode === 'iptables' && iptablesData && (
            <IptablesView
              data={iptablesData}
              showRaw={showRaw}
              onToggleRaw={() => setShowRaw(!showRaw)}
            />
          )}

          {/* Combined View */}
          {viewMode === 'combined' && combinedData && (
            <CombinedView data={combinedData} />
          )}
        </>
      )}
    </div>
  );
}

// Config Rules Table Component
function ConfigRulesTable({ rules, onDelete, onToggleSuspend }) {
  if (rules.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">No firewall rules</h3>
        <p className="text-gray-500 dark:text-dark-muted mb-4">Get started by adding your first firewall rule.</p>
        <Link to="/firewall/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-dark-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Action
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Protocol
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Port
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              IP Address
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Comment
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className={`hover:bg-gray-50 dark:hover:bg-dark-border/50 ${
                rule.suspended ? 'opacity-50' : ''
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    rule.action === 'ACCEPT'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {rule.action === 'ACCEPT' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {rule.action}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                {rule.protocol}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-dark-text">
                {rule.port || 'All'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-dark-text">
                {rule.ip}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-muted max-w-xs truncate">
                {rule.comment || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {rule.suspended ? (
                  <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
                    <Pause className="w-4 h-4" />
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    to={`/firewall/${rule.id}/edit`}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onToggleSuspend(rule.id, rule.suspended)}
                    className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
                    title={rule.suspended ? 'Unsuspend' : 'Suspend'}
                  >
                    {rule.suspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDelete(rule.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-gray-50 dark:bg-dark-border border-t border-gray-200 dark:border-dark-border">
        <p className="text-sm text-gray-500 dark:text-dark-muted">
          {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
        </p>
      </div>
    </div>
  );
}

// Live iptables View Component
function IptablesView({ data, showRaw, onToggleRaw }) {
  return (
    <div className="space-y-4">
      {/* Policy Badge */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-dark-muted">INPUT Chain Policy:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              data.policy === 'DROP'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : data.policy === 'ACCEPT'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
            }`}
          >
            {data.policy}
          </span>
          {data.policy === 'DROP' && (
            <span className="text-xs text-green-600 dark:text-green-400">
              (Secure - Default deny)
            </span>
          )}
        </div>
        <button
          onClick={onToggleRaw}
          className="btn btn-sm btn-secondary"
        >
          {showRaw ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showRaw ? 'Hide Raw' : 'Show Raw'}
        </button>
      </div>

      {/* Raw Output */}
      {showRaw && (
        <div className="card p-4 bg-gray-900 dark:bg-black">
          <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre">
            {data.raw || 'No output available'}
          </pre>
        </div>
      )}

      {/* Parsed Rules */}
      {data.rules && data.rules.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Protocol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Port
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Packets
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase">
                  Bytes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {data.rules.map((rule, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        rule.action === 'ACCEPT'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : rule.action === 'DROP'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {rule.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                    {rule.protocol.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-dark-text">
                    {rule.source}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-dark-text">
                    {rule.port || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-dark-muted text-right">
                    {parseInt(rule.packets).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-dark-muted text-right">
                    {formatBytes(parseInt(rule.bytes))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">
            No iptables rules found
          </h3>
          <p className="text-gray-500 dark:text-dark-muted">
            Firewall may not be enabled or no rules are configured.
          </p>
        </div>
      )}
    </div>
  );
}

// Combined View Component
function CombinedView({ data }) {
  const [expandedConfig, setExpandedConfig] = useState(true);
  const [expandedActive, setExpandedActive] = useState(true);

  return (
    <div className="space-y-4">
      {/* Firewall Status */}
      <div className="card p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Firewall:</span>
          {data.firewallEnabled ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle className="w-4 h-4" />
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
              <XCircle className="w-4 h-4" />
              Disabled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Policy:</span>
          <span className="font-mono text-sm">{data.policy}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Config Rules:</span>
          <span className="font-medium">{data.configuredRules?.length || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Active Rules:</span>
          <span className="font-medium">{data.activeRules?.length || 0}</span>
        </div>
      </div>

      {/* Configured Rules */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setExpandedConfig(!expandedConfig)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-border flex items-center justify-between hover:bg-gray-100 dark:hover:bg-dark-border/80 transition-colors"
        >
          <span className="font-medium flex items-center gap-2">
            <List className="w-4 h-4" />
            Configured Rules (HestiaCP)
            <span className="text-sm text-gray-500 dark:text-dark-muted">
              ({data.configuredRules?.length || 0})
            </span>
          </span>
          {expandedConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedConfig && data.configuredRules && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-dark-card">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Protocol</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {data.configuredRules.map((rule) => (
                  <tr key={rule.id} className={rule.suspended ? 'opacity-50' : ''}>
                    <td className="px-4 py-2 text-sm font-mono">{rule.id}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rule.action === 'ACCEPT'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{rule.protocol}</td>
                    <td className="px-4 py-2 text-sm font-mono">{rule.port}</td>
                    <td className="px-4 py-2 text-sm font-mono">{rule.ip}</td>
                    <td className="px-4 py-2">
                      {rule.suspended ? (
                        <span className="text-yellow-600 text-xs">Suspended</span>
                      ) : (
                        <span className="text-green-600 text-xs">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Rules */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setExpandedActive(!expandedActive)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-border flex items-center justify-between hover:bg-gray-100 dark:hover:bg-dark-border/80 transition-colors"
        >
          <span className="font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Active Rules (iptables)
            <span className="text-sm text-gray-500 dark:text-dark-muted">
              ({data.activeRules?.length || 0})
            </span>
          </span>
          {expandedActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedActive && data.activeRules && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-dark-card">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Protocol</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Packets</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {data.activeRules.map((rule, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rule.action === 'ACCEPT'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{rule.protocol.toUpperCase()}</td>
                    <td className="px-4 py-2 text-sm font-mono">{rule.source}</td>
                    <td className="px-4 py-2 text-sm font-mono">{rule.port || '-'}</td>
                    <td className="px-4 py-2 text-sm text-right">{parseInt(rule.packets).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatBytes(parseInt(rule.bytes))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

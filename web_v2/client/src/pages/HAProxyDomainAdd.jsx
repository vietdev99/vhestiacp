import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Network,
  Server,
  Lock,
  Shield,
  ChevronDown,
  ChevronRight,
  Info,
  Plus,
  X,
  Route,
  Trash2,
  Edit3,
  Check,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const SERVER_TYPES = [
  { value: 'ip', label: 'IP:Port', placeholder: { host: '127.0.0.1', port: '3000' }, example: '127.0.0.1:3000' },
  { value: 'ipv6', label: 'IPv6:Port', placeholder: { host: '::1', port: '3000' }, example: '[::1]:3000' },
  { value: 'unix', label: 'Unix Socket', placeholder: { socket: '/var/run/app.sock' }, example: '/var/run/app.sock' },
  { value: 'unix-prefix', label: 'Unix (prefix)', placeholder: { socket: '/var/run/app.sock' }, example: 'unix@/var/run/app.sock' },
  { value: 'abns', label: 'Abstract Socket', placeholder: { socket: 'app.sock' }, example: 'abns@app.sock' }
];

const SSL_MODES = [
  { value: 'passthrough', label: 'SSL Passthrough (Cloudflare)', description: 'SSL passes through to backend - recommended for Cloudflare' },
  { value: 'termination', label: 'SSL Termination', description: 'HAProxy handles SSL, backend receives HTTP' },
  { value: 'none', label: 'No SSL', description: 'HTTP only, no encryption' }
];

const BALANCE_METHODS = [
  { value: 'roundrobin', label: 'Round Robin', description: 'Distribute requests evenly in sequence' },
  { value: 'leastconn', label: 'Least Connections', description: 'Route to server with fewest active connections' },
  { value: 'source', label: 'Source IP', description: 'Same client IP always goes to same server' },
  { value: 'uri', label: 'URI Hash', description: 'Hash based on request URI (good for caching)' },
  { value: 'first', label: 'First Available', description: 'Use first server with available slots' },
  { value: 'random', label: 'Random', description: 'Random server selection' }
];

const PATH_CONDITIONS = [
  { value: 'path_beg', label: 'Starts with', description: 'Match paths starting with pattern (e.g., /api)' },
  { value: 'path_end', label: 'Ends with', description: 'Match paths ending with pattern (e.g., .json)' },
  { value: 'path', label: 'Exact match', description: 'Match exact path only' },
  { value: 'path_reg', label: 'Regex', description: 'Match using regular expression' }
];

// Backend Pool Editor Component
function BackendPoolEditor({ backend, onUpdate, onDelete, isExpanded, onToggle }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ ...backend });
  const [newServer, setNewServer] = useState({
    name: '',
    type: 'ip',
    host: '127.0.0.1',
    port: '3000',
    socket: '/var/run/app.sock',
    options: ''
  });

  const buildServerAddress = (server) => {
    switch (server.type) {
      case 'ip':
        return `${server.host}:${server.port}`;
      case 'ipv6':
        const ipv6 = server.host.trim();
        return ipv6.startsWith('[') ? `${ipv6}:${server.port}` : `[${ipv6}]:${server.port}`;
      case 'unix':
        return server.socket;
      case 'unix-prefix':
        return `unix@${server.socket}`;
      case 'abns':
        return `abns@${server.socket}`;
      default:
        return `${server.host}:${server.port}`;
    }
  };

  const getNextServerName = () => `server${editData.servers.length + 1}`;

  const addServer = () => {
    if (newServer.type === 'ip' || newServer.type === 'ipv6') {
      if (!newServer.host.trim() || !newServer.port.trim()) {
        toast.error('Host and port are required');
        return;
      }
    } else {
      if (!newServer.socket.trim()) {
        toast.error('Socket path is required');
        return;
      }
    }

    const address = buildServerAddress(newServer);
    const serverName = newServer.name.trim() || getNextServerName();

    setEditData(prev => ({
      ...prev,
      servers: [...prev.servers, {
        name: serverName,
        address,
        type: newServer.type,
        options: newServer.options.trim()
      }]
    }));

    setNewServer(prev => ({
      ...prev,
      name: '',
      host: '127.0.0.1',
      port: '3000',
      socket: '/var/run/app.sock',
      options: ''
    }));
  };

  const removeServer = (index) => {
    setEditData(prev => ({
      ...prev,
      servers: prev.servers.filter((_, i) => i !== index)
    }));
  };

  const saveChanges = () => {
    if (!editData.name.trim()) {
      toast.error('Backend name is required');
      return;
    }
    if (editData.servers.length === 0) {
      toast.error('At least one server is required');
      return;
    }
    onUpdate(editData);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditData({ ...backend });
    setEditing(false);
  };

  return (
    <div className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-border cursor-pointer"
        onClick={() => !editing && onToggle()}
      >
        <div className="flex items-center gap-3">
          <button type="button" className="p-1">
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{backend.name}</span>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
            {backend.mode.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">
            {backend.balance} | {backend.servers.length} server(s)
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <Edit3 className="w-4 h-4 text-gray-500" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {editing ? (
            <>
              {/* Edit Mode */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Backend Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_') }))}
                    className="input w-full text-sm"
                    placeholder="be_nginx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mode</label>
                  <select
                    value={editData.mode}
                    onChange={(e) => setEditData(prev => ({ ...prev, mode: e.target.value }))}
                    className="input w-full text-sm"
                  >
                    <option value="http">HTTP (Layer 7)</option>
                    <option value="tcp">TCP (Layer 4)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Balance</label>
                  <select
                    value={editData.balance}
                    onChange={(e) => setEditData(prev => ({ ...prev, balance: e.target.value }))}
                    className="input w-full text-sm"
                  >
                    {BALANCE_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.options.healthCheck}
                    onChange={(e) => setEditData(prev => ({ ...prev, options: { ...prev.options, healthCheck: e.target.checked } }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>Health Check</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.options.stickySession}
                    onChange={(e) => setEditData(prev => ({ ...prev, options: { ...prev.options, stickySession: e.target.checked } }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>Sticky Session</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.options.websocket}
                    onChange={(e) => setEditData(prev => ({ ...prev, options: { ...prev.options, websocket: e.target.checked } }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>WebSocket</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.options.forwardHeaders}
                    onChange={(e) => setEditData(prev => ({ ...prev, options: { ...prev.options, forwardHeaders: e.target.checked } }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>Forward Headers</span>
                </label>
              </div>

              {/* Server List */}
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Servers</div>
                {editData.servers.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {editData.servers.map((server, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-dark-border rounded">
                        <Server className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-sm">{server.name}</span>
                        <span className="text-gray-500 font-mono text-xs">{server.address}</span>
                        {server.options && <span className="text-xs text-gray-400">({server.options})</span>}
                        <button type="button" onClick={() => removeServer(idx)} className="ml-auto text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Server Form */}
                <div className="p-3 bg-gray-50 dark:bg-dark-border rounded">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {SERVER_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNewServer(prev => ({ ...prev, type: type.value }))}
                        className={`px-2 py-1 text-xs rounded border ${
                          newServer.type === type.value
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-white dark:bg-dark-card border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newServer.name}
                        onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                        className="input w-full text-xs"
                        placeholder={getNextServerName()}
                      />
                    </div>
                    {(newServer.type === 'ip' || newServer.type === 'ipv6') ? (
                      <>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={newServer.host}
                            onChange={(e) => setNewServer(prev => ({ ...prev, host: e.target.value }))}
                            className="input w-full font-mono text-xs"
                            placeholder={newServer.type === 'ipv6' ? '::1' : '127.0.0.1'}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={newServer.port}
                            onChange={(e) => setNewServer(prev => ({ ...prev, port: e.target.value }))}
                            className="input w-full text-xs"
                            placeholder="Port"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={newServer.socket}
                          onChange={(e) => setNewServer(prev => ({ ...prev, socket: e.target.value }))}
                          className="input w-full font-mono text-xs"
                          placeholder="/var/run/app.sock"
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newServer.options}
                        onChange={(e) => setNewServer(prev => ({ ...prev, options: e.target.value }))}
                        className="input w-full text-xs"
                        placeholder="Options"
                      />
                    </div>
                    <div className="col-span-2">
                      <button type="button" onClick={addServer} className="btn btn-primary w-full h-full text-xs">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={cancelEdit} className="btn btn-secondary text-sm">
                  Cancel
                </button>
                <button type="button" onClick={saveChanges} className="btn btn-primary text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500">Mode:</span> {backend.mode.toUpperCase()}</div>
                <div><span className="text-gray-500">Balance:</span> {backend.balance}</div>
                <div>
                  <span className="text-gray-500">Options:</span>{' '}
                  {[
                    backend.options.healthCheck && 'Health',
                    backend.options.stickySession && 'Sticky',
                    backend.options.websocket && 'WS',
                    backend.options.forwardHeaders && 'FwdHdr'
                  ].filter(Boolean).join(', ') || 'None'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500">Servers:</div>
                {backend.servers.map((server, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Server className="w-3 h-3 text-green-500" />
                    <span className="font-medium">{server.name}</span>
                    <span className="font-mono text-xs text-gray-500">{server.address}</span>
                    {server.options && <span className="text-xs text-gray-400">({server.options})</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function HAProxyDomainAdd() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [expandedBackend, setExpandedBackend] = useState(null);

  // Get current user for backend name prefix
  const { data: userInfo } = useQuery({
    queryKey: ['userInfo'],
    queryFn: async () => {
      const response = await api.get('/api/auth/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });
  const username = userInfo?.user || 'admin';

  // Form data with new structure
  const [formData, setFormData] = useState({
    domain: '',
    aliases: [],
    routingMode: 'simple', // 'simple' | 'advanced'
    defaultBackend: '__system__', // '__system__' = route to web_backend (nginx/apache)
    aclRules: [], // { name, condition, pattern, backend }
    backends: [], // { name, mode, balance, options, servers[] }
    ssl: { mode: 'passthrough' },
    enabled: true
  });

  // Alias input state
  const [aliasInput, setAliasInput] = useState('');

  // New Backend Form State
  const [showAddBackend, setShowAddBackend] = useState(false);
  const [newBackend, setNewBackend] = useState({
    name: '',
    mode: 'http',
    balance: 'roundrobin',
    options: {
      healthCheck: true,
      stickySession: false,
      websocket: false,
      forwardHeaders: true
    },
    servers: []
  });
  const [newBackendServer, setNewBackendServer] = useState({
    name: '',
    type: 'ip',
    host: '127.0.0.1',
    port: '3000',
    socket: '/var/run/app.sock',
    options: ''
  });

  // New ACL Rule Form State
  const [newAclRule, setNewAclRule] = useState({
    name: '',
    condition: 'path_beg',
    pattern: '/api',
    backend: ''
  });

  // Helper functions
  const buildServerAddress = (server) => {
    switch (server.type) {
      case 'ip':
        return `${server.host}:${server.port}`;
      case 'ipv6':
        const ipv6 = server.host.trim();
        return ipv6.startsWith('[') ? `${ipv6}:${server.port}` : `[${ipv6}]:${server.port}`;
      case 'unix':
        return server.socket;
      case 'unix-prefix':
        return `unix@${server.socket}`;
      case 'abns':
        return `abns@${server.socket}`;
      default:
        return `${server.host}:${server.port}`;
    }
  };

  const getNextBackendName = () => `${username}_be_${formData.backends.length + 1}`;
  const getNextServerName = () => `server${newBackend.servers.length + 1}`;

  // Add alias
  const addAlias = () => {
    const alias = aliasInput.trim().toLowerCase();
    if (!alias) return;
    if (formData.aliases.includes(alias)) {
      toast.error('Alias already exists');
      return;
    }
    setFormData(prev => ({
      ...prev,
      aliases: [...prev.aliases, alias]
    }));
    setAliasInput('');
  };

  const removeAlias = (index) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter((_, i) => i !== index)
    }));
  };

  // Add server to new backend
  const addServerToNewBackend = () => {
    if (newBackendServer.type === 'ip' || newBackendServer.type === 'ipv6') {
      if (!newBackendServer.host.trim() || !newBackendServer.port.trim()) {
        toast.error('Host and port are required');
        return;
      }
    } else {
      if (!newBackendServer.socket.trim()) {
        toast.error('Socket path is required');
        return;
      }
    }

    const address = buildServerAddress(newBackendServer);
    const serverName = newBackendServer.name.trim() || getNextServerName();

    setNewBackend(prev => ({
      ...prev,
      servers: [...prev.servers, {
        name: serverName,
        address,
        type: newBackendServer.type,
        options: newBackendServer.options.trim()
      }]
    }));

    setNewBackendServer(prev => ({
      ...prev,
      name: '',
      host: '127.0.0.1',
      port: '3000',
      socket: '/var/run/app.sock',
      options: ''
    }));
  };

  const removeServerFromNewBackend = (index) => {
    setNewBackend(prev => ({
      ...prev,
      servers: prev.servers.filter((_, i) => i !== index)
    }));
  };

  // Add backend pool
  const addBackendPool = () => {
    const backendName = newBackend.name.trim() || getNextBackendName();

    // Check for duplicate name
    if (formData.backends.some(b => b.name === backendName)) {
      toast.error('Backend name already exists');
      return;
    }

    if (newBackend.servers.length === 0) {
      toast.error('At least one server is required');
      return;
    }

    const backend = {
      ...newBackend,
      name: backendName
    };

    setFormData(prev => ({
      ...prev,
      backends: [...prev.backends, backend]
      // No longer auto-set defaultBackend - user can keep __system__ or manually change
    }));

    // Reset form
    setNewBackend({
      name: '',
      mode: 'http',
      balance: 'roundrobin',
      options: {
        healthCheck: true,
        stickySession: false,
        websocket: false,
        forwardHeaders: true
      },
      servers: []
    });
    setShowAddBackend(false);
  };

  // Update backend pool
  const updateBackendPool = (index, updatedBackend) => {
    setFormData(prev => {
      const newBackends = [...prev.backends];
      const oldName = newBackends[index].name;
      newBackends[index] = updatedBackend;

      // Update ACL rules that reference the old name
      const newAclRules = prev.aclRules.map(rule =>
        rule.backend === oldName ? { ...rule, backend: updatedBackend.name } : rule
      );

      // Update default backend if needed
      const newDefaultBackend = prev.defaultBackend === oldName ? updatedBackend.name : prev.defaultBackend;

      return {
        ...prev,
        backends: newBackends,
        aclRules: newAclRules,
        defaultBackend: newDefaultBackend
      };
    });
  };

  // Delete backend pool
  const deleteBackendPool = (index) => {
    const backendName = formData.backends[index].name;

    // Check if any ACL rules reference this backend
    const rulesUsingBackend = formData.aclRules.filter(r => r.backend === backendName);
    if (rulesUsingBackend.length > 0) {
      toast.error(`Cannot delete: ${rulesUsingBackend.length} ACL rule(s) reference this backend`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      backends: prev.backends.filter((_, i) => i !== index),
      defaultBackend: prev.defaultBackend === backendName
        ? (prev.backends.length > 1 ? prev.backends.find((_, i) => i !== index)?.name : '')
        : prev.defaultBackend
    }));
  };

  // Add ACL rule
  const addAclRule = () => {
    if (!newAclRule.pattern.trim()) {
      toast.error('Pattern is required');
      return;
    }
    if (!newAclRule.backend) {
      toast.error('Please select a backend');
      return;
    }

    const ruleName = newAclRule.name.trim() ||
      newAclRule.pattern.replace(/^\//, '').replace(/[^a-zA-Z0-9]/g, '_') ||
      `rule${formData.aclRules.length + 1}`;

    setFormData(prev => ({
      ...prev,
      aclRules: [...prev.aclRules, { ...newAclRule, name: ruleName }]
    }));

    setNewAclRule({
      name: '',
      condition: 'path_beg',
      pattern: '',
      backend: formData.backends[0]?.name || ''
    });
  };

  // Remove ACL rule
  const removeAclRule = (index) => {
    setFormData(prev => ({
      ...prev,
      aclRules: prev.aclRules.filter((_, i) => i !== index)
    }));
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/haproxy/domains', data);
    },
    onSuccess: () => {
      toast.success('Domain added to HAProxy successfully');
      navigate('/haproxy/domains');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to add domain to HAProxy');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.domain) {
      setError('Please enter a domain');
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(formData.domain)) {
      setError('Please enter a valid domain name (e.g., app.example.com)');
      return;
    }

    // Validate: either have custom backends OR use system backend
    if (formData.backends.length === 0 && formData.defaultBackend !== '__system__') {
      setError('Please create a backend pool or use System Web Server as default');
      return;
    }

    // For advanced mode with ACL rules, verify rule backends exist
    if (formData.routingMode === 'advanced') {
      for (const rule of formData.aclRules) {
        if (rule.backend !== '__system__' && !formData.backends.some(b => b.name === rule.backend)) {
          setError(`ACL rule references non-existent backend: ${rule.backend}`);
          return;
        }
      }
    }

    // Validate defaultBackend exists (if not system)
    if (formData.defaultBackend !== '__system__' && !formData.backends.some(b => b.name === formData.defaultBackend)) {
      setError('Selected default backend does not exist');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/haproxy/domains" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary-600" />
            Add HAProxy Domain
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Configure frontend routing and backend pools
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ====== FRONTEND CONFIGURATION ====== */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-primary-600" />
              Frontend Configuration
            </h2>

            {/* Domain */}
            <div className="mb-4">
              <label htmlFor="domain" className="block text-sm font-medium mb-1">
                Domain <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value.toLowerCase() }))}
                className="input"
                placeholder="app.example.com"
              />
            </div>

            {/* Aliases */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Domain Aliases</label>
              {formData.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.aliases.map((alias, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-dark-border rounded text-sm">
                      {alias}
                      <button type="button" onClick={() => removeAlias(idx)} className="text-gray-500 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                  className="input flex-1"
                  placeholder="www.example.com"
                />
                <button type="button" onClick={addAlias} className="btn btn-secondary">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Additional domains that route to the same backend</p>
            </div>

            {/* Routing Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Routing Mode</label>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.routingMode === 'simple'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="routingMode"
                    value="simple"
                    checked={formData.routingMode === 'simple'}
                    onChange={() => setFormData(prev => ({ ...prev, routingMode: 'simple' }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">Simple</div>
                    <div className="text-xs text-gray-500">Route all traffic to one backend</div>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.routingMode === 'advanced'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="routingMode"
                    value="advanced"
                    checked={formData.routingMode === 'advanced'}
                    onChange={() => setFormData(prev => ({ ...prev, routingMode: 'advanced' }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">Advanced (ACL Rules)</div>
                    <div className="text-xs text-gray-500">Use path-based routing to different backends</div>
                  </div>
                </label>
              </div>
            </div>

            {/* ACL Rules (Advanced Mode) */}
            {formData.routingMode === 'advanced' && (
              <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Route className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-sm">ACL Rules</span>
                </div>

                {/* Existing Rules */}
                {formData.aclRules.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formData.aclRules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-dark-card rounded border border-purple-100 dark:border-purple-800">
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
                          {PATH_CONDITIONS.find(c => c.value === rule.condition)?.label}
                        </span>
                        <code className="font-mono text-sm">{rule.pattern}</code>
                        <span className="text-gray-400">→</span>
                        <span className={`font-medium text-sm ${rule.backend === '__system__' ? 'text-green-600' : 'text-blue-600'}`}>
                          {rule.backend === '__system__' ? 'System Web Server' : rule.backend}
                        </span>
                        <button type="button" onClick={() => removeAclRule(idx)} className="ml-auto text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Rule Form */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <select
                      value={newAclRule.condition}
                      onChange={(e) => setNewAclRule(prev => ({ ...prev, condition: e.target.value }))}
                      className="input w-full text-sm"
                    >
                      {PATH_CONDITIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={newAclRule.pattern}
                      onChange={(e) => setNewAclRule(prev => ({ ...prev, pattern: e.target.value }))}
                      className="input w-full font-mono text-sm"
                      placeholder="/api"
                    />
                  </div>
                  <div className="col-span-4">
                    <select
                      value={newAclRule.backend}
                      onChange={(e) => setNewAclRule(prev => ({ ...prev, backend: e.target.value }))}
                      className="input w-full text-sm"
                    >
                      <option value="">Select backend...</option>
                      <option value="__system__">System Web Server</option>
                      {formData.backends.map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={addAclRule}
                      disabled={!newAclRule.pattern || !newAclRule.backend}
                      className="btn btn-primary w-full h-full"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Rules are evaluated in order. Requests not matching any rule go to the default backend.
                </p>
              </div>
            )}

            {/* Default Backend Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Backend <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.defaultBackend}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultBackend: e.target.value }))}
                className="input w-full"
              >
                <option value="__system__">System Web Server (nginx/apache → port 8080)</option>
                {formData.backends.map(b => (
                  <option key={b.name} value={b.name}>{b.name} ({b.servers.length} server{b.servers.length !== 1 ? 's' : ''})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.routingMode === 'advanced'
                  ? 'Fallback backend for requests not matching any ACL rule'
                  : 'All traffic will be routed to this backend'}
              </p>
            </div>
          </div>

          {/* ====== BACKEND POOLS ====== */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Backend Pools
              </h2>
              {!showAddBackend && (
                <button
                  type="button"
                  onClick={() => setShowAddBackend(true)}
                  className="btn btn-primary text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Backend
                </button>
              )}
            </div>

            {/* Existing Backend Pools */}
            <div className="space-y-3 mb-4">
              {formData.backends.map((backend, idx) => (
                <BackendPoolEditor
                  key={backend.name}
                  backend={backend}
                  onUpdate={(updated) => updateBackendPool(idx, updated)}
                  onDelete={() => deleteBackendPool(idx)}
                  isExpanded={expandedBackend === idx}
                  onToggle={() => setExpandedBackend(expandedBackend === idx ? null : idx)}
                />
              ))}
              {formData.backends.length === 0 && !showAddBackend && (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No backend pools yet</p>
                  <p className="text-sm">Click "Add Backend" to create one</p>
                </div>
              )}
            </div>

            {/* Add Backend Form */}
            {showAddBackend && (
              <div className="p-4 border border-dashed border-blue-300 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-4">New Backend Pool</div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Backend Name</label>
                    <input
                      type="text"
                      value={newBackend.name}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_') }))}
                      className="input w-full text-sm"
                      placeholder={getNextBackendName()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mode</label>
                    <select
                      value={newBackend.mode}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, mode: e.target.value }))}
                      className="input w-full text-sm"
                    >
                      <option value="http">HTTP (Layer 7)</option>
                      <option value="tcp">TCP (Layer 4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Balance</label>
                    <select
                      value={newBackend.balance}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, balance: e.target.value }))}
                      className="input w-full text-sm"
                    >
                      {BALANCE_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Backend Options */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBackend.options.healthCheck}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, options: { ...prev.options, healthCheck: e.target.checked } }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Health Check</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBackend.options.stickySession}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, options: { ...prev.options, stickySession: e.target.checked } }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Sticky Session</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBackend.options.websocket}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, options: { ...prev.options, websocket: e.target.checked } }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>WebSocket</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBackend.options.forwardHeaders}
                      onChange={(e) => setNewBackend(prev => ({ ...prev, options: { ...prev.options, forwardHeaders: e.target.checked } }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Forward Headers</span>
                  </label>
                </div>

                {/* Servers */}
                <div className="border-t border-blue-200 dark:border-blue-800 pt-4">
                  <div className="text-sm font-medium mb-2">Servers</div>

                  {newBackend.servers.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {newBackend.servers.map((server, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-dark-card rounded">
                          <Server className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="font-medium text-sm">{server.name}</span>
                          <span className="text-gray-500 font-mono text-xs">{server.address}</span>
                          {server.options && <span className="text-xs text-gray-400">({server.options})</span>}
                          <button type="button" onClick={() => removeServerFromNewBackend(idx)} className="ml-auto text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Server Form */}
                  <div className="p-3 bg-white dark:bg-dark-card rounded border border-blue-100 dark:border-blue-800">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {SERVER_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewBackendServer(prev => ({ ...prev, type: type.value }))}
                          className={`px-2 py-1 text-xs rounded border ${
                            newBackendServer.type === type.value
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-white dark:bg-dark-card border-gray-300 dark:border-dark-border'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={newBackendServer.name}
                          onChange={(e) => setNewBackendServer(prev => ({ ...prev, name: e.target.value }))}
                          className="input w-full text-xs"
                          placeholder={getNextServerName()}
                        />
                      </div>
                      {(newBackendServer.type === 'ip' || newBackendServer.type === 'ipv6') ? (
                        <>
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={newBackendServer.host}
                              onChange={(e) => setNewBackendServer(prev => ({ ...prev, host: e.target.value }))}
                              className="input w-full font-mono text-xs"
                              placeholder={newBackendServer.type === 'ipv6' ? '::1' : '127.0.0.1'}
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={newBackendServer.port}
                              onChange={(e) => setNewBackendServer(prev => ({ ...prev, port: e.target.value }))}
                              className="input w-full text-xs"
                              placeholder="Port"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={newBackendServer.socket}
                            onChange={(e) => setNewBackendServer(prev => ({ ...prev, socket: e.target.value }))}
                            className="input w-full font-mono text-xs"
                            placeholder="/var/run/app.sock"
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={newBackendServer.options}
                          onChange={(e) => setNewBackendServer(prev => ({ ...prev, options: e.target.value }))}
                          className="input w-full text-xs"
                          placeholder="Options"
                        />
                      </div>
                      <div className="col-span-2">
                        <button type="button" onClick={addServerToNewBackend} className="btn btn-secondary w-full h-full text-xs">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBackend(false);
                      setNewBackend({
                        name: '',
                        mode: 'http',
                        balance: 'roundrobin',
                        options: { healthCheck: true, stickySession: false, websocket: false, forwardHeaders: true },
                        servers: []
                      });
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addBackendPool}
                    disabled={newBackend.servers.length === 0}
                    className="btn btn-primary text-sm"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Add Backend Pool
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ====== SSL CONFIGURATION ====== */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              SSL Configuration
            </h2>

            <div className="space-y-2">
              {SSL_MODES.map(mode => (
                <label
                  key={mode.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.ssl.mode === mode.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sslMode"
                    value={mode.value}
                    checked={formData.ssl.mode === mode.value}
                    onChange={() => setFormData(prev => ({ ...prev, ssl: { ...prev.ssl, mode: mode.value } }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{mode.label}</div>
                    <div className="text-xs text-gray-500">{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {formData.ssl.mode === 'termination' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    SSL certificates will be managed by HestiaCP's existing SSL system.
                    Make sure your domain has a valid SSL certificate configured.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ====== SUMMARY ====== */}
          {formData.domain && (formData.backends.length > 0 || formData.defaultBackend === '__system__') && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                Configuration Summary
              </h2>

              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Domain:</dt>
                  <dd className="font-medium">{formData.domain}</dd>
                </div>
                {formData.aliases.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Aliases:</dt>
                    <dd>{formData.aliases.join(', ')}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Routing Mode:</dt>
                  <dd>{formData.routingMode === 'simple' ? 'Simple' : 'Advanced (ACL)'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Default Backend:</dt>
                  <dd className="font-medium text-blue-600">
                    {formData.defaultBackend === '__system__' ? 'System Web Server (nginx/apache)' : formData.defaultBackend}
                  </dd>
                </div>
                {formData.routingMode === 'advanced' && formData.aclRules.length > 0 && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <dt className="text-gray-500 mb-1">ACL Rules ({formData.aclRules.length}):</dt>
                      {formData.aclRules.map((rule, idx) => (
                        <dd key={idx} className="ml-4 font-mono text-xs">
                          {rule.pattern} → {rule.backend === '__system__' ? 'System Web' : rule.backend}
                        </dd>
                      ))}
                    </div>
                  </>
                )}
                <div className="border-t pt-2 mt-2">
                  <dt className="text-gray-500 mb-1">Backend Pools ({formData.backends.length}):</dt>
                  {formData.backends.map((backend, idx) => (
                    <dd key={idx} className="ml-4 text-xs">
                      <span className="font-medium">{backend.name}</span>
                      <span className="text-gray-400"> - {backend.servers.length} server(s), {backend.balance}</span>
                    </dd>
                  ))}
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">SSL:</dt>
                  <dd>{SSL_MODES.find(m => m.value === formData.ssl.mode)?.label}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* ====== ACTIONS ====== */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending || !formData.domain || (formData.backends.length === 0 && formData.defaultBackend !== '__system__')}
              className="btn btn-primary flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Domain...
                </>
              ) : (
                'Add to HAProxy'
              )}
            </button>
            <Link to="/haproxy/domains" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

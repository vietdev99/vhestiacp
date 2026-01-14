import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Network, Server, Globe, Settings, RefreshCw, ExternalLink,
  ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Trash2,
  BarChart3, Activity, GitBranch
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HAProxy() {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['haproxy'],
    queryFn: async () => {
      const res = await api.get('/api/haproxy');
      return res.data;
    }
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/haproxy/restart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['haproxy']);
      toast.success('HAProxy restarted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to restart HAProxy');
    }
  });

  const toggleOptions = (key) => {
    setExpandedOptions(prev => ({
      ...prev,
      [key]: !prev[key]
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
      <div className="card p-6 text-center text-red-600">
        Failed to load HAProxy status. Please try again.
      </div>
    );
  }

  // HAProxy not installed
  if (!data?.installed) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Network className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-6" />
        <h2 className="text-2xl font-semibold mb-2">HAProxy is not installed</h2>
        <p className="text-gray-500 dark:text-dark-muted mb-6">
          HAProxy load balancer is not installed on this server.
        </p>
        <button className="btn btn-primary">
          Install HAProxy
        </button>
      </div>
    );
  }

  const { status, config, statsInfo } = data;
  const frontends = config?.frontends || {};
  const backends = config?.backends || {};
  const listens = config?.listens || {};

  // Extract stats info
  let statsPort = '8404';
  let statsUri = '/stats';
  let statsUser = '';
  let statsPass = '';

  if (listens.stats) {
    const statsData = listens.stats;
    if (statsData.bind?.[0]) {
      const portMatch = statsData.bind[0].match(/:(\d+)/);
      if (portMatch) statsPort = portMatch[1];
    }
    if (statsData.stats_uri) statsUri = statsData.stats_uri;
    if (statsData.stats_auth) {
      const [user, pass] = statsData.stats_auth.split(':');
      statsUser = user || '';
      statsPass = pass || '';
    }
  }

  const statsUrl = `http://${window.location.hostname}:${statsPort}${statsUri}`;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link to="/services" className="btn btn-secondary px-3 py-1.5 text-sm">
            <Server className="w-4 h-4 mr-1" />
            Back to Server
          </Link>
          <Link to="/haproxy/config" className="btn btn-secondary px-3 py-1.5 text-sm">
            <Settings className="w-4 h-4 mr-1 text-orange-500" />
            Configure
          </Link>
          <button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="btn btn-secondary px-3 py-1.5 text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1 text-blue-500 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
            {restartMutation.isPending ? 'Restarting...' : 'Restart'}
          </button>
          <Link to="/haproxy/visualize" className="btn btn-secondary px-3 py-1.5 text-sm">
            <GitBranch className="w-4 h-4 mr-1 text-purple-500" />
            Visualize
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/haproxy/frontend/add" className="btn btn-secondary px-3 py-1.5 text-sm">
            <Globe className="w-4 h-4 mr-1 text-green-500" />
            Add Frontend
          </Link>
          <Link to="/haproxy/backend/add" className="btn btn-secondary px-3 py-1.5 text-sm">
            <Server className="w-4 h-4 mr-1 text-blue-500" />
            Add Backend
          </Link>
        </div>
      </div>

      {/* Server Summary */}
      <div className="card mb-6">
        <div className="p-6 flex items-start gap-6">
          <div className={`p-4 rounded-xl ${status?.STATUS === 'running' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <Network className={`w-10 h-10 ${status?.STATUS === 'running' ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-4">HAProxy Load Balancer</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-dark-muted block">Status</span>
                <span className={`font-medium flex items-center gap-1 ${status?.STATUS === 'running' ? 'text-green-600' : 'text-red-600'}`}>
                  <Activity className="w-4 h-4" />
                  {status?.STATUS === 'running' ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-dark-muted block">Version</span>
                <span className="font-medium">{status?.VERSION || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-dark-muted block">Config File</span>
                <span className="font-medium text-sm">/etc/haproxy/haproxy.cfg</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-dark-muted block">Frontends</span>
                <span className="font-medium">{Object.keys(frontends).length}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-dark-muted block">Backends</span>
                <span className="font-medium">{Object.keys(backends).length}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-dark-muted block">Listen Sections</span>
                <span className="font-medium">{Object.keys(listens).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {listens.stats && (
        <div className="card mb-6 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="p-4 flex items-center justify-between border-b border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Stats Dashboard
            </h3>
            <a
              href={statsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary px-3 py-1.5 text-sm"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Stats
            </a>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-dark-muted block mb-1">URL</span>
              <a href={statsUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm break-all">
                {statsUrl}
              </a>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-dark-muted block mb-1">Port</span>
              <code className="bg-white dark:bg-dark-bg px-2 py-1 rounded text-sm">{statsPort}</code>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-dark-muted block mb-1">Username</span>
              <code className="bg-white dark:bg-dark-bg px-2 py-1 rounded text-sm">{statsUser}</code>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-dark-muted block mb-1">Password</span>
              <div className="flex items-center gap-2">
                <code className="bg-white dark:bg-dark-bg px-2 py-1 rounded text-sm">
                  {showPassword ? statsPass : '•'.repeat(statsPass.length || 8)}
                </code>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frontends and Backends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frontends */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-dark-border">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold">Frontends</h2>
          </div>
          {Object.keys(frontends).length === 0 ? (
            <p className="text-gray-500 dark:text-dark-muted italic">No frontends configured</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(frontends).map(([name, data]) => (
                <div key={name} className="card">
                  <div className="p-3 flex items-center justify-between bg-gray-50 dark:bg-dark-border border-b border-gray-200 dark:border-dark-border">
                    <h3 className="font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      {name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-dark-bg rounded">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    {/* Bind */}
                    <div className="flex gap-3">
                      <span className="text-gray-500 dark:text-dark-muted w-28">Bind</span>
                      <div className="flex flex-wrap gap-1">
                        {data.bind?.map((b, i) => (
                          <code key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {b}
                          </code>
                        ))}
                      </div>
                    </div>
                    {/* Mode */}
                    {data.mode && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Mode</span>
                        <code className="px-2 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-xs">{data.mode}</code>
                      </div>
                    )}
                    {/* Default Backend */}
                    {data.default_backend && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Default Backend</span>
                        <code className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          {data.default_backend}
                        </code>
                      </div>
                    )}
                    {/* Use Backends */}
                    {data.use_backends?.length > 0 && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Routing</span>
                        <div className="space-y-1">
                          {data.use_backends.map((ub, i) => (
                            <div key={i} className="text-xs">
                              <code className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                                {ub.backend}
                              </code>
                              {ub.condition && (
                                <span className="ml-2 text-gray-500">if {ub.condition}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Options */}
                    {data.options?.length > 0 && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Options</span>
                        <button
                          onClick={() => toggleOptions(`frontend_${name}`)}
                          className="text-primary-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          {expandedOptions[`frontend_${name}`] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {data.options.length} option(s)
                        </button>
                      </div>
                    )}
                    {expandedOptions[`frontend_${name}`] && data.options?.length > 0 && (
                      <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                        {data.options.join('\n')}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backends */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-dark-border">
            <Server className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold">Backends</h2>
          </div>
          {Object.keys(backends).length === 0 ? (
            <p className="text-gray-500 dark:text-dark-muted italic">No backends configured</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(backends).map(([name, data]) => (
                <div key={name} className="card">
                  <div className="p-3 flex items-center justify-between bg-gray-50 dark:bg-dark-border border-b border-gray-200 dark:border-dark-border">
                    <h3 className="font-medium flex items-center gap-2">
                      <Server className="w-4 h-4 text-green-500" />
                      {name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-dark-bg rounded">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    {/* Mode */}
                    {data.mode && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Mode</span>
                        <code className="px-2 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-xs">{data.mode}</code>
                      </div>
                    )}
                    {/* Balance */}
                    {data.balance && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Balance</span>
                        <code className="px-2 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-xs">{data.balance}</code>
                      </div>
                    )}
                    {/* Servers */}
                    {data.servers?.length > 0 && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Servers</span>
                        <div className="space-y-1">
                          {data.servers.map((server, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <code className="px-2 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-xs flex items-center gap-1">
                                <Server className="w-3 h-3" />
                                {server.name}: {server.address}
                              </code>
                              {server.options && (
                                <span className="text-xs text-gray-500">{server.options}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Options */}
                    {data.options?.length > 0 && (
                      <div className="flex gap-3">
                        <span className="text-gray-500 dark:text-dark-muted w-28">Options</span>
                        <button
                          onClick={() => toggleOptions(`backend_${name}`)}
                          className="text-primary-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          {expandedOptions[`backend_${name}`] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {data.options.length} option(s)
                        </button>
                      </div>
                    )}
                    {expandedOptions[`backend_${name}`] && data.options?.length > 0 && (
                      <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                        {data.options.join('\n')}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Listen Sections */}
      {Object.keys(listens).filter(k => k !== 'stats').length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-dark-border">
            <Network className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold">Listen Sections</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Object.entries(listens).filter(([k]) => k !== 'stats').map(([name, data]) => (
              <div key={name} className="card">
                <div className="p-3 flex items-center justify-between bg-gray-50 dark:bg-dark-border border-b border-gray-200 dark:border-dark-border">
                  <h3 className="font-medium flex items-center gap-2">
                    <Network className="w-4 h-4 text-orange-500" />
                    {name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-dark-bg rounded">
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-2 text-sm">
                  {/* Bind */}
                  {data.bind?.length > 0 && (
                    <div className="flex gap-3">
                      <span className="text-gray-500 dark:text-dark-muted w-28">Bind</span>
                      <div className="flex flex-wrap gap-1">
                        {data.bind.map((b, i) => (
                          <code key={i} className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                            {b}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Mode */}
                  {data.mode && (
                    <div className="flex gap-3">
                      <span className="text-gray-500 dark:text-dark-muted w-28">Mode</span>
                      <code className="px-2 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-xs">{data.mode}</code>
                    </div>
                  )}
                  {/* Servers */}
                  {data.servers?.length > 0 && (
                    <div className="flex gap-3">
                      <span className="text-gray-500 dark:text-dark-muted w-28">Servers</span>
                      <div className="space-y-1">
                        {data.servers.map((server, i) => (
                          <code key={i} className="block px-2 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-xs">
                            {server.name}: {server.address}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-500 dark:text-dark-muted">
        {Object.keys(frontends).length} frontend(s), {Object.keys(backends).length} backend(s), {Object.keys(listens).length} listen section(s)
      </div>
    </div>
  );
}

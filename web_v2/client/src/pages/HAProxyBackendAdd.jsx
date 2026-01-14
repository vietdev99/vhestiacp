import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft, Server, Plus, X, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HAProxyBackendAdd() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    mode: 'http',
    balance: 'roundrobin',
    servers: [],
    options: [],
    health_check: true
  });

  const [newServer, setNewServer] = useState({ name: '', address: '', port: '', options: '' });
  const [newOption, setNewOption] = useState('');

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/haproxy/backend', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['haproxy']);
      toast.success('Backend added successfully');
      navigate('/haproxy');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add backend');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Backend name is required');
      return;
    }
    if (formData.servers.length === 0) {
      toast.error('At least one server is required');
      return;
    }
    addMutation.mutate(formData);
  };

  const addServer = () => {
    if (newServer.name.trim() && newServer.address.trim() && newServer.port.trim()) {
      const address = `${newServer.address}:${newServer.port}`;
      setFormData(prev => ({
        ...prev,
        servers: [...prev.servers, {
          name: newServer.name.trim(),
          address: address,
          options: newServer.options.trim()
        }]
      }));
      setNewServer({ name: '', address: '', port: '', options: '' });
    }
  };

  const removeServer = (index) => {
    setFormData(prev => ({
      ...prev,
      servers: prev.servers.filter((_, i) => i !== index)
    }));
  };

  const addOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/haproxy" className="btn btn-secondary px-3 py-1.5 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Server className="w-5 h-5 text-green-500" />
          Add Backend
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="card p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Backend Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input w-full"
              placeholder="e.g., web_backend, api_servers"
              required
            />
          </div>

          {/* Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                className="input w-full"
              >
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Balance Method</label>
              <select
                value={formData.balance}
                onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                className="input w-full"
              >
                <option value="roundrobin">Round Robin</option>
                <option value="leastconn">Least Connections</option>
                <option value="source">Source IP</option>
                <option value="uri">URI Hash</option>
                <option value="first">First Available</option>
                <option value="random">Random</option>
              </select>
            </div>
          </div>

          {/* Health Check */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.health_check}
                onChange={(e) => setFormData(prev => ({ ...prev, health_check: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Enable Health Check</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Automatically check server health and remove failed servers</p>
          </div>

          {/* Servers */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Servers <span className="text-red-500">*</span>
            </label>
            {formData.servers.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.servers.map((server, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded">
                    <Server className="w-4 h-4 text-green-500" />
                    <div className="flex-1">
                      <span className="font-medium">{server.name}</span>
                      <span className="text-gray-500 ml-2">{server.address}</span>
                      {server.options && (
                        <span className="text-xs text-gray-400 ml-2">({server.options})</span>
                      )}
                    </div>
                    <button type="button" onClick={() => removeServer(idx)} className="text-red-500 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                value={newServer.name}
                onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Server name"
              />
              <input
                type="text"
                value={newServer.address}
                onChange={(e) => setNewServer(prev => ({ ...prev, address: e.target.value }))}
                className="input"
                placeholder="Address (IP/hostname)"
              />
              <input
                type="text"
                value={newServer.port}
                onChange={(e) => setNewServer(prev => ({ ...prev, port: e.target.value }))}
                className="input"
                placeholder="Port"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newServer.options}
                  onChange={(e) => setNewServer(prev => ({ ...prev, options: e.target.value }))}
                  className="input flex-1"
                  placeholder="Options"
                />
                <button type="button" onClick={addServer} className="btn btn-secondary px-3">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Options: weight 1, backup, check, etc.</p>
          </div>

          {/* Additional Options */}
          <div>
            <label className="block text-sm font-medium mb-2">Additional Options</label>
            {formData.options.length > 0 && (
              <div className="space-y-1 mb-2">
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-border rounded text-sm font-mono">
                    {opt}
                    <button type="button" onClick={() => removeOption(idx)} className="ml-auto text-red-500 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                className="input flex-1 font-mono"
                placeholder="e.g., option httpchk GET /, cookie SERVERID insert"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
              />
              <button type="button" onClick={addOption} className="btn btn-secondary px-3">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  options: [...prev.options.filter(o => !o.includes('httpchk')), 'option httpchk GET /', 'http-check expect status 200-499']
                }))}
                className="btn btn-secondary px-3 py-1 text-xs"
              >
                HTTP Health Check
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  options: [...prev.options.filter(o => !o.includes('cookie')), 'cookie SERVERID insert indirect nocache']
                }))}
                className="btn btn-secondary px-3 py-1 text-xs"
              >
                Sticky Sessions (Cookie)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  options: [...prev.options.filter(o => !o.includes('forwardfor')), 'option forwardfor', 'http-request set-header X-Real-IP %[src]']
                }))}
                className="btn btn-secondary px-3 py-1 text-xs"
              >
                Forward Headers
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  options: [...prev.options.filter(o => !o.includes('timeout')), 'timeout connect 10s', 'timeout server 30s']
                }))}
                className="btn btn-secondary px-3 py-1 text-xs"
              >
                Custom Timeouts
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="btn btn-primary"
            >
              <Save className={`w-4 h-4 mr-2 ${addMutation.isPending ? 'animate-spin' : ''}`} />
              {addMutation.isPending ? 'Adding...' : 'Add Backend'}
            </button>
            <Link to="/haproxy" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft, Globe, Plus, X, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HAProxyFrontendAdd() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    bind: ['*:80'],
    mode: 'http',
    default_backend: '',
    options: [],
    acls: [],
    use_backends: []
  });

  const [newBind, setNewBind] = useState('');
  const [newOption, setNewOption] = useState('');
  const [newAcl, setNewAcl] = useState({ name: '', condition: '' });
  const [newUseBackend, setNewUseBackend] = useState({ backend: '', condition: '' });

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/haproxy/frontend', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['haproxy']);
      toast.success('Frontend added successfully');
      navigate('/haproxy');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add frontend');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Frontend name is required');
      return;
    }
    if (formData.bind.length === 0) {
      toast.error('At least one bind address is required');
      return;
    }
    addMutation.mutate(formData);
  };

  const addBind = () => {
    if (newBind.trim() && !formData.bind.includes(newBind.trim())) {
      setFormData(prev => ({
        ...prev,
        bind: [...prev.bind, newBind.trim()]
      }));
      setNewBind('');
    }
  };

  const removeBind = (index) => {
    setFormData(prev => ({
      ...prev,
      bind: prev.bind.filter((_, i) => i !== index)
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

  const addAcl = () => {
    if (newAcl.name.trim() && newAcl.condition.trim()) {
      setFormData(prev => ({
        ...prev,
        acls: [...prev.acls, { ...newAcl }]
      }));
      setNewAcl({ name: '', condition: '' });
    }
  };

  const removeAcl = (index) => {
    setFormData(prev => ({
      ...prev,
      acls: prev.acls.filter((_, i) => i !== index)
    }));
  };

  const addUseBackend = () => {
    if (newUseBackend.backend.trim()) {
      setFormData(prev => ({
        ...prev,
        use_backends: [...prev.use_backends, { ...newUseBackend }]
      }));
      setNewUseBackend({ backend: '', condition: '' });
    }
  };

  const removeUseBackend = (index) => {
    setFormData(prev => ({
      ...prev,
      use_backends: prev.use_backends.filter((_, i) => i !== index)
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
          <Globe className="w-5 h-5 text-blue-500" />
          Add Frontend
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="card p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Frontend Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input w-full"
              placeholder="e.g., http_front, api_frontend"
              required
            />
          </div>

          {/* Bind Addresses */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Bind Addresses <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.bind.map((bind, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  {bind}
                  <button type="button" onClick={() => removeBind(idx)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBind}
                onChange={(e) => setNewBind(e.target.value)}
                className="input flex-1"
                placeholder="e.g., *:80, 0.0.0.0:8080, :443 ssl crt /path/to/cert.pem"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBind())}
              />
              <button type="button" onClick={addBind} className="btn btn-secondary px-3">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode */}
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

          {/* Default Backend */}
          <div>
            <label className="block text-sm font-medium mb-2">Default Backend</label>
            <input
              type="text"
              value={formData.default_backend}
              onChange={(e) => setFormData(prev => ({ ...prev, default_backend: e.target.value }))}
              className="input w-full"
              placeholder="e.g., web_backend"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty if using only conditional routing</p>
          </div>

          {/* ACLs */}
          <div>
            <label className="block text-sm font-medium mb-2">ACL Rules</label>
            {formData.acls.length > 0 && (
              <div className="space-y-2 mb-2">
                {formData.acls.map((acl, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-border rounded text-sm">
                    <span className="font-medium">{acl.name}</span>
                    <span className="text-gray-500">{acl.condition}</span>
                    <button type="button" onClick={() => removeAcl(idx)} className="ml-auto text-red-500 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newAcl.name}
                onChange={(e) => setNewAcl(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="ACL name (e.g., is_api)"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAcl.condition}
                  onChange={(e) => setNewAcl(prev => ({ ...prev, condition: e.target.value }))}
                  className="input flex-1"
                  placeholder="Condition (e.g., path_beg /api)"
                />
                <button type="button" onClick={addAcl} className="btn btn-secondary px-3">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Use Backends (Routing Rules) */}
          <div>
            <label className="block text-sm font-medium mb-2">Routing Rules (use_backend)</label>
            {formData.use_backends.length > 0 && (
              <div className="space-y-2 mb-2">
                {formData.use_backends.map((ub, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                    <span className="font-medium text-orange-700 dark:text-orange-300">{ub.backend}</span>
                    {ub.condition && <span className="text-gray-500">if {ub.condition}</span>}
                    <button type="button" onClick={() => removeUseBackend(idx)} className="ml-auto text-red-500 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newUseBackend.backend}
                onChange={(e) => setNewUseBackend(prev => ({ ...prev, backend: e.target.value }))}
                className="input"
                placeholder="Backend name"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUseBackend.condition}
                  onChange={(e) => setNewUseBackend(prev => ({ ...prev, condition: e.target.value }))}
                  className="input flex-1"
                  placeholder="Condition (e.g., is_api)"
                />
                <button type="button" onClick={addUseBackend} className="btn btn-secondary px-3">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
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
                placeholder="e.g., option forwardfor, http-request set-header X-Custom value"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
              />
              <button type="button" onClick={addOption} className="btn btn-secondary px-3">
                <Plus className="w-4 h-4" />
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
              {addMutation.isPending ? 'Adding...' : 'Add Frontend'}
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

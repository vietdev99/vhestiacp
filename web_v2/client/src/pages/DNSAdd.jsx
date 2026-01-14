import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, AlertCircle, Loader2, Save, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

export default function DNSAdd() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    domain: '',
    ip: '',
    template: 'default',
    exp: getDefaultExpDate(),
    ttl: '14400',
    nameservers: ['ns1.', 'ns2.']
  });

  function getDefaultExpDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  // Auto-set first IP when systemInfo loads
  useEffect(() => {
    if (systemInfo?.ips?.length > 0 && !formData.ip) {
      setFormData(prev => ({ ...prev, ip: systemInfo.ips[0] }));
    }
  }, [systemInfo]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/dns', data);
    },
    onSuccess: () => {
      navigate('/dns');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create DNS zone');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.domain) {
      setError('Domain is required');
      return;
    }

    createMutation.mutate({
      domain: formData.domain.toLowerCase().trim(),
      ip: formData.ip,
      template: formData.template,
      exp: formData.exp,
      ttl: formData.ttl,
      ns1: formData.nameservers[0] || '',
      ns2: formData.nameservers[1] || '',
      ns3: formData.nameservers[2] || '',
      ns4: formData.nameservers[3] || ''
    });
  };

  const addNameServer = () => {
    if (formData.nameservers.length < 8) {
      setFormData({
        ...formData,
        nameservers: [...formData.nameservers, '']
      });
    }
  };

  const removeNameServer = (index) => {
    if (formData.nameservers.length > 2) {
      const newNs = formData.nameservers.filter((_, i) => i !== index);
      setFormData({ ...formData, nameservers: newNs });
    }
  };

  const updateNameServer = (index, value) => {
    const newNs = [...formData.nameservers];
    newNs[index] = value;
    setFormData({ ...formData, nameservers: newNs });
  };

  // Auto-update nameservers when domain changes
  const handleDomainChange = (newDomain) => {
    const domain = newDomain.toLowerCase().trim();
    setFormData(prev => ({
      ...prev,
      domain,
      nameservers: prev.nameservers.map((ns, i) => {
        // Extract prefix (ns1, ns2, etc.) and append new domain
        const prefix = ns.split('.')[0] || `ns${i + 1}`;
        return domain ? `${prefix}.${domain}` : `${prefix}.`;
      })
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/dns" className="btn btn-secondary px-3 py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </div>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="btn btn-primary px-4 py-1.5 text-sm"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save
        </button>
      </div>

      {/* Form */}
      <div className="card p-6">
        <h1 className="text-xl font-bold mb-6">Add DNS Zone</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-1">
              Domain
            </label>
            <input
              type="text"
              id="domain"
              value={formData.domain}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="input"
              placeholder="example.com"
              required
            />
          </div>

          {/* IP Address */}
          <div>
            <label htmlFor="ip" className="block text-sm font-medium mb-1">
              IP Address
            </label>
            <select
              id="ip"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              className="input"
            >
              <option value="">Select IP address</option>
              {systemInfo?.ips?.map((ip) => (
                <option key={ip} value={ip}>{ip}</option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div>
            <label htmlFor="template" className="block text-sm font-medium mb-1">
              Template <span className="text-xs text-gray-500 font-normal ml-1">BIND9</span>
            </label>
            <select
              id="template"
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              className="input"
            >
              {(systemInfo?.dnsTemplates || ['default', 'child-ns', 'default-nomail', 'gmail', 'office365', 'zoho']).map(tpl => (
                <option key={tpl} value={tpl}>{tpl}</option>
              ))}
            </select>
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-dark-border rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border/80"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced Options
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 pt-2">
              {/* Expiration Date */}
              <div>
                <label htmlFor="exp" className="block text-sm font-medium mb-1">
                  Expiration Date <span className="text-xs text-gray-500 font-normal ml-1">(YYYY-MM-DD)</span>
                </label>
                <input
                  type="date"
                  id="exp"
                  value={formData.exp}
                  onChange={(e) => setFormData({ ...formData, exp: e.target.value })}
                  className="input"
                />
              </div>

              {/* TTL */}
              <div>
                <label htmlFor="ttl" className="block text-sm font-medium mb-1">
                  TTL
                </label>
                <input
                  type="text"
                  id="ttl"
                  value={formData.ttl}
                  onChange={(e) => setFormData({ ...formData, ttl: e.target.value })}
                  className="input"
                  placeholder="14400"
                />
              </div>

              {/* Name Servers */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name Servers
                </label>
                <div className="space-y-2">
                  {formData.nameservers.map((ns, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={ns}
                        onChange={(e) => updateNameServer(index, e.target.value)}
                        className="input flex-1"
                        placeholder={`ns${index + 1}.example.com`}
                      />
                      {formData.nameservers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeNameServer(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.nameservers.length < 8 && (
                  <button
                    type="button"
                    onClick={addNameServer}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Name Server
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

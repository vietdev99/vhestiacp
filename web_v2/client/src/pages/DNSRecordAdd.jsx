import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DNS_TYPES = ['A', 'AAAA', 'CAA', 'CNAME', 'DNSKEY', 'DS', 'IPSECKEY', 'KEY', 'MX', 'NS', 'PTR', 'SPF', 'SRV', 'TLSA', 'TXT'];

export default function DNSRecordAdd() {
  const { domain } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    record: '@',
    type: 'A',
    value: '',
    priority: '',
    ttl: ''
  });

  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  // Auto-set first IP when systemInfo loads
  useEffect(() => {
    if (systemInfo?.ips?.length > 0 && !formData.value && formData.type === 'A') {
      setFormData(prev => ({ ...prev, value: systemInfo.ips[0] }));
    }
  }, [systemInfo]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post(`/api/dns/${domain}/records`, data);
    },
    onSuccess: () => {
      toast.success('Record created successfully');
      navigate(`/dns/${domain}`);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create record');
    }
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    setError('');

    if (!formData.record) {
      setError('Record is required');
      return;
    }
    if (!formData.value) {
      setError('IP or Value is required');
      return;
    }

    createMutation.mutate({
      record: formData.record,
      type: formData.type,
      value: formData.value,
      priority: formData.priority || undefined,
      ttl: formData.ttl || undefined
    });
  };

  // Show domain hint under record input
  const getRecordHint = () => {
    if (formData.record === '@') {
      return domain;
    }
    return `${formData.record}.${domain}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Link to={`/dns/${domain}`} className="btn btn-secondary px-3 py-1.5 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
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
        <h1 className="text-xl font-bold mb-6">Add DNS Record</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Domain (readonly) */}
          <div>
            <label className="block text-sm font-medium mb-1">Domain</label>
            <input
              type="text"
              value={domain}
              disabled
              className="input bg-gray-100 dark:bg-dark-border"
            />
          </div>

          {/* Record */}
          <div>
            <label htmlFor="record" className="block text-sm font-medium mb-1">
              Record
            </label>
            <input
              type="text"
              id="record"
              value={formData.record}
              onChange={(e) => setFormData({ ...formData, record: e.target.value })}
              className="input"
              placeholder="@"
            />
            <p className="mt-1 text-xs text-gray-500">{getRecordHint()}</p>
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              {DNS_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* IP or Value */}
          <div>
            <label htmlFor="value" className="block text-sm font-medium mb-1">
              IP or Value
            </label>
            <div className="relative">
              {(formData.type === 'A' || formData.type === 'AAAA') && systemInfo?.ips?.length > 0 && (
                <select
                  className="absolute inset-y-0 left-0 w-full opacity-0 cursor-pointer"
                  onChange={(e) => e.target.value && setFormData({ ...formData, value: e.target.value })}
                  value=""
                >
                  <option value="">Select IP...</option>
                  {systemInfo.ips.map(ip => (
                    <option key={ip} value={ip}>{ip}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="input"
                placeholder={formData.type === 'A' ? '192.168.1.1' : 'Value'}
                required
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-1">
              Priority <span className="text-gray-400 text-xs font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="input"
              placeholder="10"
            />
          </div>

          {/* TTL */}
          <div>
            <label htmlFor="ttl" className="block text-sm font-medium mb-1">
              TTL <span className="text-gray-400 text-xs font-normal">(Optional)</span>
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
        </form>
      </div>
    </div>
  );
}

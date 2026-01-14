import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DNSEdit() {
  const { domain } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    ip: '',
    template: 'default',
    exp: '',
    soa: '',
    ttl: '14400'
  });

  // Get system info
  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  // Get DNS zone details
  const { data: zoneData, isLoading } = useQuery({
    queryKey: ['dns-zone', domain],
    queryFn: async () => {
      const res = await api.get(`/api/dns/${domain}`);
      return res.data;
    }
  });

  // Initialize form with zone data
  useEffect(() => {
    if (zoneData) {
      setFormData({
        ip: zoneData.IP || '',
        template: zoneData.TPL || 'default',
        exp: zoneData.EXP || '',
        soa: zoneData.SOA || '',
        ttl: zoneData.TTL || '14400'
      });
    }
  }, [zoneData]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await api.put(`/api/dns/${domain}`, data);
    },
    onSuccess: () => {
      toast.success('DNS zone updated successfully');
      navigate('/dns');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update DNS zone');
    }
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    setError('');

    updateMutation.mutate({
      ip: formData.ip,
      template: formData.template,
      exp: formData.exp,
      ttl: formData.ttl,
      soa: formData.soa
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/dns" className="btn btn-secondary px-3 py-1.5 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="btn btn-primary px-4 py-1.5 text-sm"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save
        </button>
      </div>

      {/* Form */}
      <div className="card p-6">
        <h1 className="text-xl font-bold mb-6">Edit DNS Domain</h1>

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
              {(systemInfo?.dnsTemplates || ['default']).map(tpl => (
                <option key={tpl} value={tpl}>{tpl}</option>
              ))}
            </select>
          </div>

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

          {/* SOA */}
          <div>
            <label htmlFor="soa" className="block text-sm font-medium mb-1">
              SOA
            </label>
            <input
              type="text"
              id="soa"
              value={formData.soa}
              onChange={(e) => setFormData({ ...formData, soa: e.target.value })}
              className="input"
              placeholder="ns1.example.com"
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
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Shield,
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FirewallAdd() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    action: 'ACCEPT',
    protocol: 'TCP',
    port: '',
    ip: '0.0.0.0/0',
    comment: ''
  });

  // Fetch IPset lists for IP field autocomplete
  const { data: ipsetData } = useQuery({
    queryKey: ['firewall-ipset'],
    queryFn: async () => {
      const res = await api.get('/api/firewall/ipset/lists');
      return res.data;
    }
  });

  const ipsetLists = ipsetData?.ipsets?.filter(s => !s.suspended) || [];

  const addMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/firewall', data);
    },
    onSuccess: () => {
      toast.success('Firewall rule added successfully');
      navigate('/firewall');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add rule');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate
    if (!formData.port && formData.protocol !== 'ICMP') {
      toast.error('Port is required for TCP/UDP');
      return;
    }

    if (!formData.ip) {
      toast.error('IP address is required');
      return;
    }

    addMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Common ports for quick selection
  const commonPorts = [
    { label: 'SSH', port: '22' },
    { label: 'HTTP', port: '80' },
    { label: 'HTTPS', port: '443' },
    { label: 'FTP', port: '21' },
    { label: 'SMTP', port: '25' },
    { label: 'SMTPS', port: '465' },
    { label: 'MySQL', port: '3306' },
    { label: 'PostgreSQL', port: '5432' },
    { label: 'MongoDB', port: '27017' },
    { label: 'Redis', port: '6379' }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/firewall"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7" />
            Add Firewall Rule
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Create a new iptables firewall rule
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            Action *
          </label>
          <div className="flex gap-4">
            <label
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                formData.action === 'ACCEPT'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border/80'
              }`}
            >
              <input
                type="radio"
                name="action"
                value="ACCEPT"
                checked={formData.action === 'ACCEPT'}
                onChange={handleChange}
                className="sr-only"
              />
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">ACCEPT</span>
            </label>
            <label
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                formData.action === 'DROP'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border/80'
              }`}
            >
              <input
                type="radio"
                name="action"
                value="DROP"
                checked={formData.action === 'DROP'}
                onChange={handleChange}
                className="sr-only"
              />
              <XCircle className="w-5 h-5" />
              <span className="font-medium">DROP</span>
            </label>
          </div>
        </div>

        {/* Protocol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            Protocol *
          </label>
          <div className="flex gap-2">
            {['TCP', 'UDP', 'ICMP'].map((proto) => (
              <button
                key={proto}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, protocol: proto }))}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  formData.protocol === proto
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>
        </div>

        {/* Port */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            Port {formData.protocol !== 'ICMP' ? '*' : '(N/A for ICMP)'}
          </label>
          <input
            type="text"
            name="port"
            value={formData.port}
            onChange={handleChange}
            placeholder={formData.protocol === 'ICMP' ? 'Not applicable' : 'e.g., 80, 443, 8080-8090'}
            disabled={formData.protocol === 'ICMP'}
            className="input w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-muted">
            Single port, comma-separated (80,443), or range (8080-8090). Use 0 for all ports.
          </p>

          {/* Quick port buttons */}
          {formData.protocol !== 'ICMP' && (
            <div className="mt-2 flex flex-wrap gap-2">
              {commonPorts.map((p) => (
                <button
                  key={p.port}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, port: p.port }))}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-dark-muted rounded hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                >
                  {p.label} ({p.port})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* IP Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            IP Address / CIDR / IPset *
          </label>
          <input
            type="text"
            name="ip"
            value={formData.ip}
            onChange={handleChange}
            placeholder="e.g., 192.168.1.0/24 or 0.0.0.0/0"
            className="input w-full"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-muted">
            Use 0.0.0.0/0 for any IP. For IPset, use format: ipset:listname
          </p>

          {/* IPset lists */}
          {ipsetLists.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500 dark:text-dark-muted">IPset Lists:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {ipsetLists.map((ipset) => (
                  <button
                    key={ipset.name}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, ip: `ipset:${ipset.name}` }))}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {ipset.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            Comment
          </label>
          <input
            type="text"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            placeholder="Optional description"
            className="input w-full"
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Rules are processed in order by rule ID</li>
                <li>ACCEPT rules allow traffic, DROP rules block traffic</li>
                <li>After adding rules, click "Apply Rules" to activate them</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <Link to="/firewall" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="btn btn-primary"
          >
            {addMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Add Rule
          </button>
        </div>
      </form>
    </div>
  );
}

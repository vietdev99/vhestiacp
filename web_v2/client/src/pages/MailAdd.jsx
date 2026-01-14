import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

export default function MailAdd() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    domain: '',
    antispam: true,
    antivirus: true,
    dkim: true
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/mail', data);
    },
    onSuccess: () => {
      navigate('/mail');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create mail domain');
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
      antispam: formData.antispam ? 'yes' : 'no',
      antivirus: formData.antivirus ? 'yes' : 'no',
      dkim: formData.dkim ? 'yes' : 'no'
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/mail" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Mail Domain</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">Create a new mail domain</p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-1">
              Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="input"
              placeholder="example.com"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.antispam}
                onChange={(e) => setFormData({ ...formData, antispam: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Enable AntiSpam</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.antivirus}
                onChange={(e) => setFormData({ ...formData, antivirus: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Enable AntiVirus</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.dkim}
                onChange={(e) => setFormData({ ...formData, dkim: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Enable DKIM</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Mail Domain'
              )}
            </button>
            <Link to="/mail" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

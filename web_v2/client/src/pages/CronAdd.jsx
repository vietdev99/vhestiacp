import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

export default function CronAdd() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    min: '*',
    hour: '*',
    day: '*',
    month: '*',
    wday: '*',
    cmd: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/cron', data);
    },
    onSuccess: () => {
      navigate('/cron');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create cron job');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.cmd) {
      setError('Command is required');
      return;
    }

    createMutation.mutate(formData);
  };

  const presets = [
    { label: 'Every minute', min: '*', hour: '*', day: '*', month: '*', wday: '*' },
    { label: 'Every 5 minutes', min: '*/5', hour: '*', day: '*', month: '*', wday: '*' },
    { label: 'Every hour', min: '0', hour: '*', day: '*', month: '*', wday: '*' },
    { label: 'Every day at midnight', min: '0', hour: '0', day: '*', month: '*', wday: '*' },
    { label: 'Every week (Sunday)', min: '0', hour: '0', day: '*', month: '*', wday: '0' },
    { label: 'Every month', min: '0', hour: '0', day: '1', month: '*', wday: '*' },
  ];

  const applyPreset = (preset) => {
    setFormData({
      ...formData,
      min: preset.min,
      hour: preset.hour,
      day: preset.day,
      month: preset.month,
      wday: preset.wday
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/cron" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Cron Job</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">Create a new scheduled task</p>
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
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-border dark:hover:bg-dark-border/80"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium mb-2">Schedule</label>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minute</label>
                <input
                  type="text"
                  value={formData.min}
                  onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                  className="input text-center"
                  placeholder="*"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hour</label>
                <input
                  type="text"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })}
                  className="input text-center"
                  placeholder="*"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Day</label>
                <input
                  type="text"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  className="input text-center"
                  placeholder="*"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Month</label>
                <input
                  type="text"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="input text-center"
                  placeholder="*"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Weekday</label>
                <input
                  type="text"
                  value={formData.wday}
                  onChange={(e) => setFormData({ ...formData, wday: e.target.value })}
                  className="input text-center"
                  placeholder="*"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Current: <code className="bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded">
                {formData.min} {formData.hour} {formData.day} {formData.month} {formData.wday}
              </code>
            </p>
          </div>

          {/* Command */}
          <div>
            <label htmlFor="cmd" className="block text-sm font-medium mb-1">
              Command <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cmd"
              value={formData.cmd}
              onChange={(e) => setFormData({ ...formData, cmd: e.target.value })}
              className="input font-mono text-sm min-h-[100px]"
              placeholder="/usr/bin/php /home/user/public_html/cron.php"
              required
            />
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
                'Create Cron Job'
              )}
            </button>
            <Link to="/cron" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

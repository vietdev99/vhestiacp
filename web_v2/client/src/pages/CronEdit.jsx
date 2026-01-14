import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CronEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    min: '*',
    hour: '*',
    day: '*',
    month: '*',
    wday: '*',
    cmd: ''
  });

  // Get cron job details
  const { data: jobData, isLoading } = useQuery({
    queryKey: ['cron-job', id],
    queryFn: async () => {
      const res = await api.get(`/api/cron/${id}`);
      return res.data;
    }
  });

  // Initialize form with job data
  useEffect(() => {
    if (jobData) {
      setFormData({
        min: jobData.MIN || '*',
        hour: jobData.HOUR || '*',
        day: jobData.DAY || '*',
        month: jobData.MONTH || '*',
        wday: jobData.WDAY || '*',
        cmd: jobData.CMD || ''
      });
    }
  }, [jobData]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await api.put(`/api/cron/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job updated successfully');
      navigate('/cron');
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update cron job');
    }
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    setError('');

    if (!formData.cmd) {
      setError('Command is required');
      return;
    }

    updateMutation.mutate(formData);
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
        <Link to="/cron" className="btn btn-secondary px-3 py-1.5 text-sm">
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
        <h1 className="text-xl font-bold mb-6">Edit Cron Job #{id}</h1>

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
        </form>
      </div>
    </div>
  );
}

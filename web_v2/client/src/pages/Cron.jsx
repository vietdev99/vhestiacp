import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Search, Clock, MoreVertical, Edit, Trash2, PauseCircle, PlayCircle, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Cron() {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRefs = useRef({});
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const res = await api.get('/api/cron');
      return res.data;
    }
  });

  const jobs = data?.jobs || [];
  const notifications = data?.notifications || false;

  const handleOpenMenu = (jobId) => {
    if (openMenu === jobId) {
      setOpenMenu(null);
      return;
    }

    const button = buttonRefs.current[jobId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setOpenMenu(jobId);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/cron/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job deleted');
      setOpenMenu(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete cron job');
    }
  });

  const suspendMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/api/cron/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job suspended');
      setOpenMenu(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to suspend cron job');
    }
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/api/cron/${id}/unsuspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success('Cron job activated');
      setOpenMenu(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to activate cron job');
    }
  });

  const notificationMutation = useMutation({
    mutationFn: async (enable) => {
      if (enable) {
        await api.post('/api/cron/notifications/enable');
      } else {
        await api.post('/api/cron/notifications/disable');
      }
    },
    onSuccess: (_, enable) => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast.success(enable ? 'Notifications enabled' : 'Notifications disabled');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update notifications');
    }
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this cron job?')) {
      deleteMutation.mutate(id);
    }
    setOpenMenu(null);
  };

  const filteredJobs = jobs?.filter(j =>
    j.CMD?.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
        Failed to load cron jobs. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cron Jobs</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage scheduled tasks
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => notificationMutation.mutate(!notifications)}
            disabled={notificationMutation.isPending}
            className={`btn ${notifications ? 'btn-success' : 'btn-secondary'}`}
            title={notifications ? 'Disable email notifications' : 'Enable email notifications'}
          >
            {notifications ? (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Notifications On
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Notifications Off
              </>
            )}
          </button>
          <Link to="/cron/add" className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Cron Job
          </Link>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cron jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Command
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredJobs.map((item, index) => (
                <tr key={item.JOB || index} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <code className="text-sm bg-gray-100 dark:bg-dark-border px-2 py-1 rounded">
                        {item.MIN} {item.HOUR} {item.DAY} {item.MONTH} {item.WDAY}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <code className="text-sm text-gray-600 dark:text-dark-muted truncate max-w-md block">
                      {item.CMD}
                    </code>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {item.SUSPENDED === 'yes' ? (
                      <span className="badge badge-danger">Suspended</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      ref={(el) => buttonRefs.current[item.JOB] = el}
                      onClick={() => handleOpenMenu(item.JOB)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? 'No cron jobs found matching your search.' : 'No cron jobs yet. Add your first job to get started.'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
      </div>

      {/* Dropdown Menu Portal */}
      {openMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenMenu(null)}
          />
          <div
            className="fixed w-48 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-xl z-50 py-1"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            {(() => {
              const item = filteredJobs.find(j => j.JOB === openMenu);
              if (!item) return null;

              return (
                <>
                  <Link
                    to={`/cron/${item.JOB}/edit`}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
                    onClick={() => setOpenMenu(null)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>

                  {item.SUSPENDED === 'yes' ? (
                    <button
                      onClick={() => unsuspendMutation.mutate(item.JOB)}
                      disabled={unsuspendMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border w-full text-left text-green-600"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Activate
                    </button>
                  ) : (
                    <button
                      onClick={() => suspendMutation.mutate(item.JOB)}
                      disabled={suspendMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border w-full text-left text-yellow-600"
                    >
                      <PauseCircle className="w-4 h-4" />
                      Suspend
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.JOB)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border w-full text-left text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              );
            })()}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

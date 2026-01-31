import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { Clock, Search, MoreVertical, Edit, Trash2, PauseCircle, PlayCircle, User, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCronjobs() {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [filterUser, setFilterUser] = useState('all'); // 'all', 'root', 'admin', or specific user
  const buttonRefs = useRef({});
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get('/api/users');
      return res.data;
    }
  });

  // Fetch all cron jobs (admin sees root + all users)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-cron-jobs'],
    queryFn: async () => {
      const res = await api.get('/api/cron');
      return res.data;
    }
  });

  const jobs = data?.jobs || [];

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
      queryClient.invalidateQueries({ queryKey: ['admin-cron-jobs'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-cron-jobs'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-cron-jobs'] });
      toast.success('Cron job activated');
      setOpenMenu(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to activate cron job');
    }
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this cron job?')) {
      deleteMutation.mutate(id);
    }
    setOpenMenu(null);
  };

  // Filter jobs by user and search
  const filteredJobs = jobs
    ?.filter(j => {
      // Filter by user
      if (filterUser !== 'all' && j.USER !== filterUser) return false;
      // Filter by search
      if (search && !j.CMD?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }) || [];

  // Get unique users from jobs
  const uniqueUsers = [...new Set(jobs.map(j => j.USER))].sort();

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
          <h1 className="text-2xl font-bold">All Cron Jobs</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage cron jobs for all users (Admin)
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* User filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Filter by User</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="input"
            >
              <option value="all">All Users ({jobs.length} jobs)</option>
              {uniqueUsers.map(user => {
                const count = jobs.filter(j => j.USER === user).length;
                return (
                  <option key={user} value={user}>
                    {user} ({count} jobs)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Search Command</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cron jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Jobs table */}
      {filteredJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">No cron jobs found</h3>
          <p className="text-gray-500 dark:text-dark-muted">
            {search || filterUser !== 'all'
              ? 'Try adjusting your filters'
              : 'No cron jobs are configured'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Command
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredJobs.map((job) => (
                <tr
                  key={job.JOB}
                  className={`hover:bg-gray-50 dark:hover:bg-dark-border/50 ${
                    job.SUSPENDED === 'yes' ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{job.USER}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">
                    {job.MIN} {job.HOUR} {job.DAY} {job.MONTH} {job.WDAY}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm bg-gray-100 dark:bg-dark-border px-2 py-1 rounded">
                      {job.CMD}
                    </code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {job.SUSPENDED === 'yes' ? (
                      <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
                        <PauseCircle className="w-4 h-4" />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                        <PlayCircle className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      ref={(el) => (buttonRefs.current[job.JOB] = el)}
                      onClick={() => handleOpenMenu(job.JOB)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 dark:bg-dark-border border-t border-gray-200 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-muted">
              Showing {filteredJobs.length} of {jobs.length} cron jobs
            </p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {openMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenMenu(null)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
          >
            <Link
              to={`/cron/${openMenu}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              onClick={() => setOpenMenu(null)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            {filteredJobs.find(j => j.JOB === openMenu)?.SUSPENDED === 'yes' ? (
              <button
                onClick={() => unsuspendMutation.mutate(openMenu)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                Activate
              </button>
            ) : (
              <button
                onClick={() => suspendMutation.mutate(openMenu)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                <PauseCircle className="w-4 h-4" />
                Suspend
              </button>
            )}
            <button
              onClick={() => handleDelete(openMenu)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

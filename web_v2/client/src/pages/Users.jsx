import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  MoreVertical,
  HardDrive,
  Globe,
  Database,
  Mail,
  LogIn
} from 'lucide-react';
import clsx from 'clsx';

export default function Users() {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRefs = useRef({});
  const queryClient = useQueryClient();
  const { loginAsUser, user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Calculate menu position when opening
  const handleOpenMenu = (username) => {
    if (openMenu === username) {
      setOpenMenu(null);
      return;
    }

    const button = buttonRefs.current[username];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setOpenMenu(username);
  };

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/api/users');
      return res.data.users;
    }
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ username, suspend }) => {
      if (suspend) {
        await api.post(`/api/users/${username}/suspend`);
      } else {
        await api.post(`/api/users/${username}/unsuspend`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (username) => {
      await api.delete(`/api/users/${username}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });

  const handleDelete = (username) => {
    if (confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
      deleteMutation.mutate(username);
    }
    setOpenMenu(null);
  };

  const handleSuspend = (username, currentlySupended) => {
    suspendMutation.mutate({ username, suspend: !currentlySupended });
    setOpenMenu(null);
  };

  const handleLoginAs = async (username) => {
    try {
      await loginAsUser(username);
      navigate('/');
    } catch (error) {
      console.error('Failed to login as user:', error);
    }
    setOpenMenu(null);
  };

  // Filter users by search
  const filteredUsers = data?.filter(user =>
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.NAME?.toLowerCase().includes(search.toLowerCase()) ||
    user.CONTACT?.toLowerCase().includes(search.toLowerCase())
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
        Failed to load users. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage system users and their resources
          </p>
        </div>
        <Link to="/users/add" className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Resources
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
              {filteredUsers.map((user) => (
                <tr key={user.username} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-400 font-medium">
                          {user.NAME?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <button
                          onClick={() => user.username !== currentUser?.username && handleLoginAs(user.username)}
                          className={`font-medium ${user.username !== currentUser?.username ? 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline cursor-pointer' : ''}`}
                          title={user.username !== currentUser?.username ? `Login as ${user.username}` : ''}
                        >
                          {user.username}
                        </button>
                        <p className="text-sm text-gray-500 dark:text-dark-muted">{user.NAME || '-'}</p>
                        <p className="text-xs text-gray-400 dark:text-dark-muted">{user.CONTACT}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="badge badge-info">{user.PACKAGE || 'default'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-dark-muted">
                      <span className="flex items-center gap-1" title="Web Domains">
                        <Globe className="w-4 h-4" />
                        {user.U_WEB_DOMAINS || 0}
                      </span>
                      <span className="flex items-center gap-1" title="Databases">
                        <Database className="w-4 h-4" />
                        {user.U_DATABASES || 0}
                      </span>
                      <span className="flex items-center gap-1" title="Mail">
                        <Mail className="w-4 h-4" />
                        {user.U_MAIL_ACCOUNTS || 0}
                      </span>
                      <span className="flex items-center gap-1" title="Disk">
                        <HardDrive className="w-4 h-4" />
                        {user.U_DISK || 0}MB
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {user.SUSPENDED === 'yes' ? (
                      <span className="badge badge-danger">Suspended</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      ref={(el) => buttonRefs.current[user.username] = el}
                      onClick={() => handleOpenMenu(user.username)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              No users found.
            </div>
          )}
        </div>
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
            <Link
              to={`/users/${openMenu}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
              onClick={() => setOpenMenu(null)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            {openMenu !== currentUser?.username && (
              <button
                onClick={() => handleLoginAs(openMenu)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
              >
                <LogIn className="w-4 h-4 text-blue-500" />
                Login as User
              </button>
            )}
            <button
              onClick={() => {
                const user = filteredUsers.find(u => u.username === openMenu);
                if (user) handleSuspend(openMenu, user.SUSPENDED === 'yes');
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
              disabled={openMenu === 'admin'}
            >
              {filteredUsers.find(u => u.username === openMenu)?.SUSPENDED === 'yes' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Unsuspend
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 text-orange-500" />
                  Suspend
                </>
              )}
            </button>
            {openMenu !== 'admin' && (
              <button
                onClick={() => handleDelete(openMenu)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ArrowLeft, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Key, History, CloudCog } from 'lucide-react';

export default function UserEdit() {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, isAdmin } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    email: '',
    name: '',
    language: 'en',
    // Advanced options
    package: 'default',
    shell: '/bin/bash',
    phpcli: '',
    role: 'user',
    loginDisabled: false,
    twofa: false,
    ns1: '',
    ns2: '',
    ns3: '',
    ns4: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch system info (shells, php versions, packages)
  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Check access
  const canEdit = isAdmin || currentUser?.username === username;

  // Fetch user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      const res = await api.get(`/api/users/${username}`);
      return res.data.user;
    },
    enabled: canEdit
  });

  // Helper to normalize shell path (Hestia stores 'bash' but we need '/bin/bash')
  const normalizeShell = (shell) => {
    if (!shell) return '/bin/bash';
    // If already a full path, return as-is
    if (shell.startsWith('/')) return shell;
    // Map short names to full paths
    const shellMap = {
      'bash': '/bin/bash',
      'sh': '/bin/sh',
      'zsh': '/bin/zsh',
      'nologin': '/usr/sbin/nologin',
      'false': '/bin/false'
    };
    return shellMap[shell] || `/bin/${shell}`;
  };

  // Update form when data loads
  useEffect(() => {
    if (userData) {
      setFormData({
        password: '',
        email: userData.CONTACT || '',
        name: userData.NAME || '',
        language: userData.LANGUAGE || 'en',
        // Advanced options
        package: userData.PACKAGE || 'default',
        shell: normalizeShell(userData.SHELL),
        phpcli: userData.PHPCLI || '',
        role: userData.ROLE || 'user',
        loginDisabled: userData.LOGIN_DISABLED === 'yes',
        twofa: !!userData.TWOFA,
        ns1: userData.NS1 || '',
        ns2: userData.NS2 || '',
        ns3: userData.NS3 || '',
        ns4: userData.NS4 || ''
      });
    }
  }, [userData]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/api/users/${username}`, data);
      return res.data;
    },
    onSuccess: () => {
      setSuccess('User updated successfully');
      setError('');
      queryClient.invalidateQueries(['user', username]);
      queryClient.invalidateQueries(['users']);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to update user');
      setSuccess('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Only send non-empty fields
    const data = {};
    if (formData.password) data.password = formData.password;
    if (formData.email) data.email = formData.email;
    if (formData.name !== undefined) data.name = formData.name;
    if (formData.language) data.language = formData.language;

    // Advanced options (admin only)
    if (isAdmin) {
      data.package = formData.package;
      data.shell = formData.shell;
      if (formData.phpcli) data.phpcli = formData.phpcli;
      if (username !== 'admin') data.role = formData.role;
      data.loginDisabled = formData.loginDisabled;
      data.twofa = formData.twofa;
      data.ns1 = formData.ns1;
      data.ns2 = formData.ns2;
      data.ns3 = formData.ns3;
      data.ns4 = formData.ns4;
    }

    updateMutation.mutate(data);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    setShowPassword(true);
  };

  if (!canEdit) {
    return (
      <div className="card p-6 text-center text-red-600">
        You don't have permission to edit this user.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to={isAdmin ? '/users' : '/'}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit User</h1>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Update {username}'s profile
            </p>
          </div>
        </div>
        {/* Toolbar buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            to={`/users/${username}/ssh-keys`}
            className="btn btn-secondary text-sm"
            title="Manage SSH Keys"
          >
            <Key className="w-4 h-4 mr-1.5 text-orange-500" />
            SSH Keys
          </Link>
          <Link
            to={`/users/${username}/logs`}
            className="btn btn-secondary text-sm"
            title="View Logs"
          >
            <History className="w-4 h-4 mr-1.5 text-purple-500" />
            Logs
          </Link>
          <Link
            to="/rclone"
            className="btn btn-secondary text-sm"
            title="Cloud Backup"
          >
            <CloudCog className="w-4 h-4 mr-1.5 text-green-500" />
            Cloud Backup
          </Link>
        </div>
      </div>

      {/* User info card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-primary-700 dark:text-primary-400 font-bold text-2xl">
              {userData?.NAME?.[0]?.toUpperCase() || username[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{username}</h2>
            <p className="text-gray-500 dark:text-dark-muted">{userData?.NAME || 'No name set'}</p>
            <div className="flex gap-2 mt-2">
              {userData?.SUSPENDED === 'yes' ? (
                <span className="badge badge-danger">Suspended</span>
              ) : (
                <span className="badge badge-success">Active</span>
              )}
              <span className="badge badge-info">{userData?.PACKAGE || 'default'}</span>
            </div>
          </div>
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

        {success && (
          <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Contact Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="john@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              New Password
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder="Leave empty to keep current"
                  minLength={formData.password ? 8 : 0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="btn btn-secondary"
                title="Generate password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
              Leave empty to keep the current password
            </p>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium mb-1">
              Language
            </label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="input"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="ru">Русский</option>
              <option value="zh-cn">中文 (简体)</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          {/* Login options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.loginDisabled}
                onChange={(e) => setFormData({ ...formData, loginDisabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={!isAdmin || username === 'admin'}
              />
              <span className="text-sm">Do not allow user to log in to Control Panel</span>
            </label>

            {!formData.loginDisabled && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.twofa}
                  onChange={(e) => setFormData({ ...formData, twofa: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">Enable two-factor authentication</span>
              </label>
            )}
          </div>

          {/* Advanced Options (Admin only) */}
          {isAdmin && (
            <>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="btn btn-secondary w-full justify-between"
                >
                  <span>Advanced Options</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-dark-border/30 rounded-lg">
                  {/* Package */}
                  <div>
                    <label htmlFor="package" className="block text-sm font-medium mb-1">
                      Package
                    </label>
                    <select
                      id="package"
                      value={formData.package}
                      onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                      className="input"
                    >
                      {systemInfo?.packages?.map((pkg) => (
                        <option key={pkg} value={pkg}>{pkg}</option>
                      )) || <option value="default">default</option>}
                    </select>
                  </div>

                  {/* Role */}
                  {username !== 'admin' && (
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium mb-1">
                        Role
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="input"
                      >
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                        <option value="dns-cluster">DNS Sync User</option>
                      </select>
                    </div>
                  )}

                  {/* SSH Access */}
                  <div>
                    <label htmlFor="shell" className="block text-sm font-medium mb-1">
                      SSH Access
                    </label>
                    <select
                      id="shell"
                      value={formData.shell}
                      onChange={(e) => setFormData({ ...formData, shell: e.target.value })}
                      className="input"
                    >
                      {(() => {
                        const shells = systemInfo?.shells || ['/bin/bash', '/bin/sh', '/usr/sbin/nologin'];
                        // Ensure current shell value is in the list
                        const shellList = formData.shell && !shells.includes(formData.shell)
                          ? [formData.shell, ...shells]
                          : shells;
                        return shellList.map((shell) => (
                          <option key={shell} value={shell}>{shell}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* PHP CLI Version */}
                  <div>
                    <label htmlFor="phpcli" className="block text-sm font-medium mb-1">
                      PHP CLI Version
                    </label>
                    <select
                      id="phpcli"
                      value={formData.phpcli}
                      onChange={(e) => setFormData({ ...formData, phpcli: e.target.value })}
                      className="input"
                    >
                      <option value="">Default</option>
                      {systemInfo?.phpVersions?.map((version) => (
                        <option key={version} value={version}>{version}</option>
                      ))}
                    </select>
                  </div>

                  {/* Name Servers */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Default Name Servers
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData.ns1}
                        onChange={(e) => setFormData({ ...formData, ns1: e.target.value })}
                        className="input"
                        placeholder="ns1.example.com"
                      />
                      <input
                        type="text"
                        value={formData.ns2}
                        onChange={(e) => setFormData({ ...formData, ns2: e.target.value })}
                        className="input"
                        placeholder="ns2.example.com"
                      />
                      <input
                        type="text"
                        value={formData.ns3}
                        onChange={(e) => setFormData({ ...formData, ns3: e.target.value })}
                        className="input"
                        placeholder="ns3.example.com (optional)"
                      />
                      <input
                        type="text"
                        value={formData.ns4}
                        onChange={(e) => setFormData({ ...formData, ns4: e.target.value })}
                        className="input"
                        placeholder="ns4.example.com (optional)"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <Link to={isAdmin ? '/users' : '/'} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

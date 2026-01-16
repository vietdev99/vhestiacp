import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Search, Database, MoreVertical, HardDrive, Leaf, Trash2, UserPlus, Key, AlertCircle, X, Eye, EyeOff, RefreshCw, Server, Loader2 } from 'lucide-react';

// Database type labels
const DB_TYPE_CONFIG = {
  mysql: { 
    label: 'MariaDB', 
    description: 'Manage your MariaDB/MySQL databases', 
    api: '/api/databases/mariadb', 
    instancesApi: '/api/mariadb/instances',
    badge: 'mysql',
    icon: Database,
    color: 'blue'
  },
  pgsql: { 
    label: 'PostgreSQL', 
    description: 'Manage your PostgreSQL databases', 
    api: '/api/databases/pgsql', 
    instancesApi: '/api/pgsql/instances',
    badge: 'pgsql',
    icon: Database,
    color: 'indigo'
  },
  mongodb: { 
    label: 'MongoDB', 
    description: 'Manage your MongoDB databases', 
    api: '/api/databases/mongodb',
    instancesApi: '/api/mongodb/instances',
    badge: 'mongodb',
    icon: Leaf,
    color: 'green'
  }
};

export default function Databases() {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const menuRef = useRef(null);
  const queryClient = useQueryClient();
  
  const dbType = searchParams.get('type') || 'mysql';
  const selectedInstance = searchParams.get('instance') || 'default';

  const typeConfig = DB_TYPE_CONFIG[dbType] || DB_TYPE_CONFIG.mysql;
  const isMongoDB = dbType === 'mongodb';
  const IconComponent = typeConfig.icon;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch instances for the selected database type
  const { data: instancesData, isLoading: instancesLoading } = useQuery({
    queryKey: ['db-instances', dbType],
    queryFn: async () => {
      try {
        const res = await api.get(typeConfig.instancesApi);
        return res.data.instances || res.data || [];
      } catch (e) {
        // Return default instance if API fails
        return [{ name: 'default', port: dbType === 'mysql' ? 3306 : dbType === 'pgsql' ? 5432 : 27017, status: 'running' }];
      }
    }
  });

  const instances = instancesData || [{ name: 'default', status: 'running' }];

  // Fetch instance config details (for clusterMode, instanceType)
  const { data: instanceConfig } = useQuery({
    queryKey: ['instance-config', dbType, selectedInstance],
    queryFn: async () => {
      if (!selectedInstance) return null;
      try {
        const res = await api.get(`${typeConfig.instancesApi}/${selectedInstance}`);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!selectedInstance
  });

  // Fetch databases for selected instance
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['databases', dbType, selectedInstance],
    queryFn: async () => {
      let apiUrl = typeConfig.api;
      let params = { type: dbType, instance: selectedInstance };
      
      const res = await api.get(apiUrl, { params });
      return res.data.databases || [];
    }
  });

  // Set instance in URL
  const setInstance = (instanceName) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('instance', instanceName);
    setSearchParams(newParams);
  };

  const filteredDatabases = data?.filter(d =>
    d.database?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (database) => {
      let endpoint = isMongoDB
        ? `/api/databases/mongodb/${encodeURIComponent(database)}`
        : `/api/databases/${encodeURIComponent(database)}`;
      
      if (selectedInstance && selectedInstance !== 'default') {
        endpoint += `?instance=${encodeURIComponent(selectedInstance)}`;
      }
      await api.delete(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['databases', dbType, selectedInstance]);
      setDeleteConfirm(null);
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ database, password }) => {
      let endpoint;
      const body = { password, instance: selectedInstance };
      
      if (isMongoDB) {
        endpoint = `/api/databases/mongodb/${encodeURIComponent(database)}/password`;
      } else if (dbType === 'mysql') {
        endpoint = `/api/databases/mariadb/${encodeURIComponent(database)}/password`;
      } else if (dbType === 'pgsql') {
        endpoint = `/api/databases/pgsql/${encodeURIComponent(database)}/password`;
      } else {
        endpoint = `/api/databases/${encodeURIComponent(database)}/password`;
      }
      
      await api.put(endpoint, body);
    },
    onSuccess: () => {
      setPasswordModal(null);
      setNewPassword('');
    }
  });

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowPassword(true);
  };

  // Get add database path with instance
  const getAddPath = () => {
    if (isMongoDB) {
      return `/databases/mongodb/add?instance=${encodeURIComponent(selectedInstance)}`;
    }
    return `/databases/add?type=${dbType}&instance=${encodeURIComponent(selectedInstance)}`;
  };

  // Get current instance info (merge list info with config details)
  const baseInstance = instances.find(i => i.name === selectedInstance) || instances[0];
  const currentInstance = instanceConfig
    ? { ...baseInstance, ...instanceConfig, settings: instanceConfig.settings }
    : baseInstance;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconComponent className={`w-6 h-6 text-${typeConfig.color}-600`} />
            {typeConfig.label}
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            {typeConfig.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to={getAddPath()} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Database
          </Link>
        </div>
      </div>

      {/* Instance Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-dark-border">
          <nav className="flex gap-1 overflow-x-auto pb-px" aria-label="Instances">
            {instancesLoading ? (
              <div className="flex items-center gap-2 px-4 py-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading instances...
              </div>
            ) : instances.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">No instances available</div>
            ) : (
              instances.map((instance) => (
                <button
                  key={instance.name}
                  onClick={() => setInstance(instance.name)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                    ${selectedInstance === instance.name
                      ? `border-${typeConfig.color}-600 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-muted dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Server className="w-4 h-4" />
                  <span>{instance.name}</span>
                  {instance.port && (
                    <span className="text-xs text-gray-400">:{instance.port}</span>
                  )}
                  <span className={`w-2 h-2 rounded-full ${instance.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                </button>
              ))
            )}
          </nav>
        </div>
        
        {/* Instance Info Bar */}
        {currentInstance && (
          <div className="mt-3 px-4 py-2 bg-gray-50 dark:bg-dark-border rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-gray-500 dark:text-dark-muted">
                Instance: <strong className="text-gray-700 dark:text-gray-300">{currentInstance.name}</strong>
              </span>
              {currentInstance.port && (
                <span className="text-gray-500 dark:text-dark-muted">
                  Port: <strong className="text-gray-700 dark:text-gray-300">{currentInstance.port}</strong>
                </span>
              )}
              {/* Show instance type/mode */}
              {(currentInstance.clusterMode || currentInstance.instanceType || currentInstance.settings?.instanceType) && (
                <span className="text-gray-500 dark:text-dark-muted">
                  Type: <strong className="text-gray-700 dark:text-gray-300 capitalize">
                    {currentInstance.clusterMode || currentInstance.instanceType || currentInstance.settings?.instanceType || 'standalone'}
                  </strong>
                </span>
              )}
              {/* Show replicaSet name for MongoDB */}
              {currentInstance.replicaSetName && currentInstance.clusterMode !== 'standalone' && (
                <span className="text-gray-500 dark:text-dark-muted">
                  ReplicaSet: <strong className="text-gray-700 dark:text-gray-300">{currentInstance.replicaSetName}</strong>
                </span>
              )}
              {currentInstance.version && (
                <span className="text-gray-500 dark:text-dark-muted">
                  Version: <strong className="text-gray-700 dark:text-gray-300">{currentInstance.version}</strong>
                </span>
              )}
            </div>
            <span className={`flex items-center gap-1 text-sm ${currentInstance.status === 'running' ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-2 h-2 rounded-full ${currentInstance.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
              {currentInstance.status === 'running' ? 'Running' : 'Stopped'}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search databases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-6 text-center text-red-600">
          Failed to load databases. Please try again.
        </div>
      )}

      {/* Databases table */}
      {!isLoading && !error && (
        <>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                      Database
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                      {isMongoDB ? 'Collections' : 'User'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                      Instance
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                      {isMongoDB ? 'Size' : 'Disk'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                      {isMongoDB ? 'Users' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                  {filteredDatabases.map((item) => (
                    <tr key={item.database} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {isMongoDB ? (
                            <Leaf className="w-5 h-5 text-green-500" />
                          ) : (
                            <Database className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="font-medium">{item.database}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-dark-muted">
                        {isMongoDB ? (item.COLLECTIONS || 0) : (item.DBUSER || '-')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {(() => {
                            const mode = currentInstance?.clusterMode ||
                                        currentInstance?.instanceType ||
                                        currentInstance?.settings?.instanceType ||
                                        'standalone';
                            // Badge color based on mode/type
                            let badgeClass = 'badge-secondary';
                            if (isMongoDB) {
                              badgeClass = mode === 'replicaset' ? 'badge-success' : 'badge-warning';
                            } else if (dbType === 'pgsql') {
                              badgeClass = mode === 'primary' ? 'badge-purple' : mode === 'standby' ? 'badge-info' : 'badge-secondary';
                            } else {
                              badgeClass = mode === 'master' ? 'badge-info' : mode === 'slave' ? 'badge-warning' : 'badge-secondary';
                            }
                            return (
                              <span className={`badge ${badgeClass} capitalize`}>
                                {mode}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-gray-400 dark:text-dark-muted">
                            {selectedInstance}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-dark-muted">
                          <HardDrive className="w-4 h-4" />
                          {isMongoDB
                            ? `${Math.round((item.SIZE || 0) / 1024)} KB`
                            : `${item.U_DISK || 0} MB`
                          }
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isMongoDB ? (
                          <span className="text-sm text-gray-600 dark:text-dark-muted">
                            {item.USERS || 0} users
                          </span>
                        ) : (
                          item.SUSPENDED === 'yes' ? (
                            <span className="badge badge-danger">Suspended</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={(e) => {
                            if (openMenu === item.database) {
                              setOpenMenu(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + 4, left: rect.right - 192 });
                              setOpenMenu(item.database);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDatabases.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
                  {search 
                    ? 'No databases found matching your search.' 
                    : `No databases in instance "${selectedInstance}". Click "Add Database" to create one.`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
            {filteredDatabases.length} {filteredDatabases.length === 1 ? 'database' : 'databases'} in {selectedInstance}
          </div>
        </>
      )}

      {/* Dropdown Menu (Fixed Position) */}
      {openMenu && (
        <div
          ref={menuRef}
          className="fixed w-48 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            onClick={() => {
              setPasswordModal(openMenu);
              setOpenMenu(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-dark-border rounded-t-lg"
          >
            <Key className="w-4 h-4" />
            Change Password
          </button>
          {!isMongoDB && (
            <button
              onClick={() => {
                // TODO: Add user modal
                setOpenMenu(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-dark-border"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
          <hr className="border-gray-200 dark:border-dark-border" />
          <button
            onClick={() => {
              setDeleteConfirm(openMenu);
              setOpenMenu(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Database</h3>
            </div>
            <p className="text-gray-600 dark:text-dark-muted mb-6">
              Are you sure you want to delete <strong>{deleteConfirm}</strong> from instance <strong>{selectedInstance}</strong>? This action cannot be undone and all data will be permanently lost.
            </p>
            {deleteMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {deleteMutation.error?.response?.data?.error || 'Failed to delete database'}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-primary-600" />
                <h3 className="text-lg font-semibold">Change Password</h3>
              </div>
              <button onClick={() => { setPasswordModal(null); setNewPassword(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-dark-muted mb-4">
              Change password for database <strong>{passwordModal}</strong> in <strong>{selectedInstance}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">New Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
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
            </div>
            {changePasswordMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {changePasswordMutation.error?.response?.data?.error || 'Failed to change password'}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setPasswordModal(null); setNewPassword(''); }}
                className="btn btn-secondary"
                disabled={changePasswordMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => changePasswordMutation.mutate({ database: passwordModal, password: newPassword })}
                className="btn btn-primary"
                disabled={changePasswordMutation.isPending || !newPassword}
              >
                {changePasswordMutation.isPending ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

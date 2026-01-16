import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Server,
  RefreshCw,
  Play,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  Cpu,
  HardDrive,
  Clock,
  Activity,
  Monitor,
  Settings,
  Database,
  ChevronDown,
  ChevronRight,
  Leaf
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Services that have edit/configure functionality
const CONFIGURABLE_SERVICES = [
  'nginx', 'apache2', 'httpd',
  'php-fpm', 'php5-fpm', 'php7.0-fpm', 'php7.1-fpm', 'php7.2-fpm', 'php7.3-fpm', 'php7.4-fpm', 'php8.0-fpm', 'php8.1-fpm', 'php8.2-fpm', 'php8.3-fpm',
  'mysql', 'mariadb', 'mysqld',
  'postgresql',
  'bind9', 'named',
  'dovecot', 'exim4', 'exim',
  'fail2ban',
  'vsftpd', 'proftpd',
  'ssh', 'sshd',
  'clamav-daemon', 'clamd',
  'spamassassin', 'spamd',
  'haproxy',
  'redis', 'redis-server'
];

const isConfigurable = (serviceName, isDbInstance = false, isInDbGroup = false) => {
  // Database instances and services in DB group have their own config pages, don't show config button here
  if (isDbInstance || isInDbGroup) return false;

  return CONFIGURABLE_SERVICES.some(s =>
    serviceName === s || serviceName.startsWith(s) || serviceName.includes('php') && serviceName.includes('fpm')
  );
};

// Database service types
const DB_SERVICE_PATTERNS = [
  'mysql', 'mariadb', 'mysqld',
  'postgresql', 'postgres',
  'mongodb', 'mongod',
  'pbm-agent'
];

const isDbService = (serviceName) => {
  return DB_SERVICE_PATTERNS.some(p => serviceName.includes(p));
};

// Get DB type icon color
const getDbTypeColor = (dbType) => {
  switch (dbType) {
    case 'mongodb':
    case 'mongodb-pbm':
      return 'text-green-600 dark:text-green-400';
    case 'mariadb':
      return 'text-blue-600 dark:text-blue-400';
    case 'postgresql':
      return 'text-purple-600 dark:text-purple-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

export default function ServerServices() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState({});
  const [dbGroupExpanded, setDbGroupExpanded] = useState(true);

  // Fetch server info and services
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['server-services'],
    queryFn: async () => {
      const res = await api.get('/api/system/server');
      return res.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Restart mutation
  const restartMutation = useMutation({
    mutationFn: async (serviceName) => {
      setActionLoading(prev => ({ ...prev, [serviceName]: 'restart' }));
      await api.post(`/api/system/server/services/${serviceName}/restart`);
    },
    onSuccess: (_, serviceName) => {
      queryClient.invalidateQueries(['server-services']);
      toast.success(`Service ${serviceName} restarted successfully`);
      setActionLoading(prev => ({ ...prev, [serviceName]: null }));
    },
    onError: (error, serviceName) => {
      toast.error(error.response?.data?.error || `Failed to restart ${serviceName}`);
      setActionLoading(prev => ({ ...prev, [serviceName]: null }));
    }
  });

  // Start mutation
  const startMutation = useMutation({
    mutationFn: async (serviceName) => {
      setActionLoading(prev => ({ ...prev, [serviceName]: 'start' }));
      await api.post(`/api/system/server/services/${serviceName}/start`);
    },
    onSuccess: (_, serviceName) => {
      queryClient.invalidateQueries(['server-services']);
      toast.success(`Service ${serviceName} started successfully`);
      setActionLoading(prev => ({ ...prev, [serviceName]: null }));
    },
    onError: (error, serviceName) => {
      toast.error(error.response?.data?.error || `Failed to start ${serviceName}`);
      setActionLoading(prev => ({ ...prev, [serviceName]: null }));
    }
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: async (serviceName) => {
      setActionLoading(prev => ({ ...prev, [serviceName]: 'stop' }));
      await api.post(`/api/system/server/services/${serviceName}/stop`);
    },
    onSuccess: (_, serviceName) => {
      queryClient.invalidateQueries(['server-services']);
      toast.success(`Service ${serviceName} stopped successfully`);
      setActionLoading(prev => ({ ...prev, [serviceName]: null }));
    },
    onError: (error, serviceName) => {
      toast.error(error.response?.data?.error || `Failed to stop ${serviceName}`);
      setActionLoading(prev => ({ ...prev, [serviceName]: null }));
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load server info. {error.response?.data?.error || ''}</p>
        <button onClick={() => refetch()} className="mt-4 btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const { system, services } = data || {};

  // Separate DB services from other services
  const dbServices = services?.filter(s => s.isDbInstance || isDbService(s.name)) || [];
  const otherServices = services?.filter(s => !s.isDbInstance && !isDbService(s.name)) || [];

  // Group DB services by type
  const dbServicesByType = {
    mongodb: dbServices.filter(s => s.dbType === 'mongodb' || (s.name.includes('mongod') && !s.name.includes('pbm'))),
    'mongodb-pbm': dbServices.filter(s => s.dbType === 'mongodb-pbm' || s.name.includes('pbm-agent')),
    mariadb: dbServices.filter(s => s.dbType === 'mariadb' || s.name.includes('mariadb') || s.name.includes('mysql')),
    postgresql: dbServices.filter(s => s.dbType === 'postgresql' || s.name.includes('postgresql') || s.name.includes('postgres'))
  };

  // Count running DB services
  const runningDbCount = dbServices.filter(s => s.state === 'running').length;
  const totalDbCount = dbServices.length;

  // Render service row
  const renderServiceRow = (service, isIndented = false, isInDbGroup = false) => (
    <tr key={service.name} className={clsx(
      "hover:bg-gray-50 dark:hover:bg-dark-border/50",
      isIndented && "bg-gray-50/50 dark:bg-dark-border/20"
    )}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={clsx("flex items-center gap-3", isIndented && "pl-6")}>
          {service.dbType === 'mongodb-pbm' ? (
            <Leaf className={clsx("w-5 h-5", service.state === 'running' ? 'text-amber-500' : 'text-gray-400')} />
          ) : service.state === 'running' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <div>
            <span className={clsx("font-medium", service.isDbInstance && getDbTypeColor(service.dbType))}>
              {service.name}
            </span>
            {(service.clusterMode || service.instanceType) && service.clusterMode !== 'standalone' && service.instanceType !== 'standalone' && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-400 capitalize">
                {service.clusterMode || service.instanceType}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-dark-muted">
        {service.description}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-dark-muted">
        {service.state === 'running' ? service.uptime : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {service.state === 'running' ? (
          <span className={clsx(
            'inline-flex items-center gap-1',
            parseFloat(service.cpu) > 50 ? 'text-red-500' :
            parseFloat(service.cpu) > 20 ? 'text-yellow-500' : 'text-green-500'
          )}>
            <Cpu className="w-4 h-4" />
            {service.cpu}%
          </span>
        ) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {service.state === 'running' ? (
          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-dark-muted">
            <HardDrive className="w-4 h-4" />
            {typeof service.memory === 'number' ? service.memory.toFixed(1) : service.memory} MB
          </span>
        ) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          {isConfigurable(service.name, service.isDbInstance, isInDbGroup) && (
            <Link
              to={`/server-services/${service.name}/edit`}
              className="btn btn-sm btn-secondary"
              title="Configure"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
          {service.state === 'running' ? (
            <>
              <button
                onClick={() => restartMutation.mutate(service.name)}
                disabled={!!actionLoading[service.name]}
                className="btn btn-sm btn-secondary"
                title="Restart"
              >
                {actionLoading[service.name] === 'restart' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to stop ${service.name}?`)) {
                    stopMutation.mutate(service.name);
                  }
                }}
                disabled={!!actionLoading[service.name]}
                className="btn btn-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                title="Stop"
              >
                {actionLoading[service.name] === 'stop' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => startMutation.mutate(service.name)}
              disabled={!!actionLoading[service.name]}
              className="btn btn-sm btn-primary"
              title="Start"
            >
              {actionLoading[service.name] === 'start' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // Render DB group header
  const renderDbGroupHeader = () => {
    if (dbServices.length === 0) return null;

    return (
      <tr
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 cursor-pointer hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-colors"
        onClick={() => setDbGroupExpanded(!dbGroupExpanded)}
      >
        <td colSpan={6} className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dbGroupExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Database Services
              </span>
              <span className="text-sm text-gray-500 dark:text-dark-muted">
                ({runningDbCount}/{totalDbCount} running)
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {dbServicesByType.mongodb.length > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  MongoDB ({dbServicesByType.mongodb.length})
                </span>
              )}
              {dbServicesByType.mariadb.length > 0 && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  MariaDB ({dbServicesByType.mariadb.length})
                </span>
              )}
              {dbServicesByType.postgresql.length > 0 && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  PostgreSQL ({dbServicesByType.postgresql.length})
                </span>
              )}
              {dbServicesByType['mongodb-pbm'].length > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Leaf className="w-3 h-3" />
                  PBM ({dbServicesByType['mongodb-pbm'].length})
                </span>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Server Services</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Monitor and manage running services on the server
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/server/configure"
            className="btn btn-primary"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Link>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Info Card */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Server Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
            <Server className="w-8 h-8 text-primary-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-dark-muted">Hostname</p>
              <p className="font-semibold">{system?.hostname || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
            <Monitor className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-dark-muted">Operating System</p>
              <p className="font-semibold">
                {system?.os} {system?.version} ({system?.arch})
              </p>
            </div>
          </div>
          {system?.hestiaVersion && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-dark-muted">Hestia Version</p>
                <p className="font-semibold">{system.hestiaVersion}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
            <Cpu className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-dark-muted">Load Average</p>
              <p className="font-semibold">{system?.loadAverage || '0 / 0 / 0'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
            <Clock className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-dark-muted">Uptime</p>
              <p className="font-semibold">{system?.uptime || '0 minutes'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-lg font-semibold">Running Services</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  CPU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Memory
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {/* Database Services Group */}
              {renderDbGroupHeader()}
              {dbGroupExpanded && dbServices.map((service) => renderServiceRow(service, true, true))}

              {/* Other Services */}
              {otherServices.map((service) => renderServiceRow(service, false, false))}
            </tbody>
          </table>
        </div>
        {(!services || services.length === 0) && (
          <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
            No services found
          </div>
        )}
      </div>
    </div>
  );
}

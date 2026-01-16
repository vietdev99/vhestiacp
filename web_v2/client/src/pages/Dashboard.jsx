import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Globe, Database, Mail, Clock, HardDrive, Users, Server, Loader2, Network } from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const res = await api.get('/api/system/user-stats');
      return res.data;
    },
    staleTime: 30000 // 30 seconds
  });

  // Build database display string
  const getDbDisplay = () => {
    if (!stats?.databases) return '0';
    const db = stats.databases;
    if (typeof db === 'number') return db;
    if (db.total === 0) return '0';

    const parts = [];
    if (db.mysql > 0) parts.push(`${db.mysql} MySQL`);
    if (db.pgsql > 0) parts.push(`${db.pgsql} PgSQL`);
    if (db.mongo > 0) parts.push(`${db.mongo} Mongo`);
    return parts.length > 0 ? parts.join(', ') : db.total.toString();
  };

  const statItems = [
    { name: 'Web Domains', value: stats?.webDomains || 0, icon: Globe, color: 'bg-blue-500', href: '/web' },
    { name: 'HAProxy Domains', value: stats?.haproxyDomains || 0, icon: Network, color: 'bg-indigo-500', href: '/haproxy/domains' },
    { name: 'Databases', value: getDbDisplay(), icon: Database, color: 'bg-green-500', href: '/databases' },
    { name: 'Mail Domains', value: stats?.mailDomains || 0, icon: Mail, color: 'bg-purple-500', href: '/mail' },
    { name: 'DNS Domains', value: stats?.dnsDomains || 0, icon: Server, color: 'bg-teal-500', href: '/dns' },
    { name: 'Cron Jobs', value: stats?.cronJobs || 0, icon: Clock, color: 'bg-orange-500', href: '/cron' },
    { name: 'Backups', value: stats?.backups || 0, icon: HardDrive, color: 'bg-cyan-500', href: '/backups' },
  ];

  if (isAdmin && stats?.totalUsers) {
    statItems.unshift({ name: 'Users', value: stats.totalUsers, icon: Users, color: 'bg-pink-500', href: '/users' });
  }

  // Format disk/bandwidth usage
  const formatSize = (mb) => {
    const num = parseInt(mb) || 0;
    if (num >= 1024) {
      return `${(num / 1024).toFixed(1)} GB`;
    }
    return `${num} MB`;
  };

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name || user?.username}!</h1>
        <p className="text-gray-500 dark:text-dark-muted mt-1">
          Here's what's happening with your server today.
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statItems.map((stat) => (
            <Link key={stat.name} to={stat.href} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">{stat.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Resource Usage */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Disk Usage */}
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-2">Disk Usage</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatSize(stats.disk?.used)}</span>
              <span className="text-gray-500 dark:text-dark-muted">
                / {stats.disk?.quota === 'unlimited' ? 'Unlimited' : formatSize(stats.disk?.quota)}
              </span>
            </div>
            {stats.disk?.quota !== 'unlimited' && (
              <div className="mt-2 h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min((parseInt(stats.disk?.used) / parseInt(stats.disk?.quota)) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Bandwidth Usage */}
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-2">Bandwidth Usage</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatSize(stats.bandwidth?.used)}</span>
              <span className="text-gray-500 dark:text-dark-muted">
                / {stats.bandwidth?.quota === 'unlimited' ? 'Unlimited' : formatSize(stats.bandwidth?.quota)}
              </span>
            </div>
            {stats.bandwidth?.quota !== 'unlimited' && (
              <div className="mt-2 h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min((parseInt(stats.bandwidth?.used) / parseInt(stats.bandwidth?.quota)) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/web/add" className="btn btn-primary">
            <Globe className="w-4 h-4 mr-2" />
            Add Web Domain
          </Link>
          <Link to="/databases/add" className="btn btn-secondary">
            <Database className="w-4 h-4 mr-2" />
            Add Database
          </Link>
          <Link to="/mail/add" className="btn btn-secondary">
            <Mail className="w-4 h-4 mr-2" />
            Add Mail Domain
          </Link>
        </div>
      </div>
    </div>
  );
}

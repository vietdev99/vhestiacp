import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  HardDrive,
  Globe,
  Mail,
  Database,
  Clock,
  Users,
  Server,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function Stats() {
  const { isAdmin } = useAuth();
  const [selectedUser, setSelectedUser] = useState('');
  const [chartMonths, setChartMonths] = useState(12);

  // Fetch stats
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stats', selectedUser],
    queryFn: async () => {
      const url = selectedUser ? `/api/stats/user/${selectedUser}` : '/api/stats';
      const res = await api.get(url);
      return res.data;
    }
  });

  // Fetch users list for filter (admin only)
  const { data: usersData } = useQuery({
    queryKey: ['stats-users'],
    queryFn: async () => {
      const res = await api.get('/api/stats/users');
      return res.data;
    },
    enabled: isAdmin
  });

  // Fetch chart data
  const { data: chartData } = useQuery({
    queryKey: ['stats-chart', selectedUser, chartMonths],
    queryFn: async () => {
      const res = await api.get(`/api/stats/chart?months=${chartMonths}`);
      return res.data;
    }
  });

  const stats = data?.stats || [];
  const users = usersData?.users || [];

  // Calculate trend (compare last 2 months)
  const getTrend = (key) => {
    if (stats.length < 2) return null;
    const current = stats[0]?.[key] || 0;
    const previous = stats[1]?.[key] || 0;
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isUp: change >= 0
    };
  };

  // Format size (MB to human readable)
  const formatSize = (mb) => {
    if (mb >= 1024 * 1024) {
      return `${(mb / (1024 * 1024)).toFixed(1)} TB`;
    } else if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  // Current month stats (latest entry)
  const currentStats = stats[0] || {};

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Statistics
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            {data?.isOverall ? 'Overall system statistics' : 'Your usage statistics'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="input"
            >
              <option value="">Overall Statistics</option>
              {users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <p className="text-red-500">Failed to load statistics</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              title="Bandwidth"
              value={formatSize(currentStats.uBandwidth || 0)}
              quota={formatSize(currentStats.bandwidth || 0)}
              icon={TrendingUp}
              color="blue"
              trend={getTrend('uBandwidth')}
            />
            <SummaryCard
              title="Disk Usage"
              value={formatSize(currentStats.uDisk || 0)}
              quota={formatSize(currentStats.diskQuota || 0)}
              icon={HardDrive}
              color="green"
              trend={getTrend('uDisk')}
            />
            <SummaryCard
              title="Web Domains"
              value={currentStats.uWebDomains || 0}
              icon={Globe}
              color="purple"
              trend={getTrend('uWebDomains')}
            />
            <SummaryCard
              title="Databases"
              value={currentStats.uDatabases || 0}
              icon={Database}
              color="orange"
              trend={getTrend('uDatabases')}
            />
          </div>

          {/* Chart Section */}
          {chartData?.chartData && chartData.chartData.length > 0 && (
            <div className="card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Usage Trend</h2>
                <select
                  value={chartMonths}
                  onChange={(e) => setChartMonths(parseInt(e.target.value))}
                  className="input text-sm"
                >
                  <option value={6}>Last 6 months</option>
                  <option value={12}>Last 12 months</option>
                  <option value={24}>Last 24 months</option>
                </select>
              </div>
              <SimpleBarChart data={chartData.chartData} />
            </div>
          )}

          {/* Monthly Stats */}
          <div className="space-y-6">
            {stats.map((stat, index) => (
              <MonthlyStatCard key={stat.date} stat={stat} formatSize={formatSize} />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-dark-muted">
            {stats.length} month{stats.length !== 1 ? 's' : ''} of data
          </div>
        </>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, value, quota, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500 dark:text-dark-muted">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {quota && (
          <p className="text-xs text-gray-400 mt-1">of {quota}</p>
        )}
      </div>
    </div>
  );
}

// Simple Bar Chart Component (without external library)
function SimpleBarChart({ data }) {
  const maxBandwidth = Math.max(...data.map(d => d.bandwidth), 1);

  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((item, index) => {
        const height = (item.bandwidth / maxBandwidth) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${item.month}: ${item.bandwidth} MB`}
            />
            <span className="text-xs text-gray-500 dark:text-dark-muted mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
              {item.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Monthly Stat Card Component
function MonthlyStatCard({ stat, formatSize }) {
  const date = new Date(stat.date);
  const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold">{monthYear}</h3>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bandwidth & Disk */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 text-gray-500 dark:text-dark-muted">
                  <TrendingUp className="w-4 h-4" />
                  Bandwidth
                </span>
                <span className="font-medium">
                  {formatSize(stat.uBandwidth)} / {formatSize(stat.bandwidth)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min((stat.uBandwidth / stat.bandwidth) * 100, 100) || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 text-gray-500 dark:text-dark-muted">
                  <HardDrive className="w-4 h-4" />
                  Disk
                </span>
                <span className="font-medium">
                  {formatSize(stat.uDisk)} / {formatSize(stat.diskQuota)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.min((stat.uDisk / stat.diskQuota) * 100, 100) || 0}%` }}
                />
              </div>
            </div>

            {/* Disk Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Web:</span>
                <span>{formatSize(stat.uDiskWeb)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mail:</span>
                <span>{formatSize(stat.uDiskMail)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Database:</span>
                <span>{formatSize(stat.uDiskDb)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">User Dir:</span>
                <span>{formatSize(stat.uDiskDirs)}</span>
              </div>
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3">
            <StatItem icon={Globe} label="Web Domains" value={stat.uWebDomains} />
            <StatItem icon={Mail} label="Mail Domains" value={stat.uMailDomains} />
            <StatItem icon={Globe} label="SSL Domains" value={stat.uWebSsl} />
            <StatItem icon={Mail} label="Mail Accounts" value={stat.uMailAccounts} />
            <StatItem icon={Globe} label="Web Aliases" value={stat.uWebAliases} />
            <StatItem icon={Database} label="Databases" value={stat.uDatabases} />
            <StatItem icon={Server} label="DNS Zones" value={stat.uDnsDomains} />
            <StatItem icon={Clock} label="Cron Jobs" value={stat.uCronJobs} />
            <StatItem icon={Server} label="DNS Records" value={stat.uDnsRecords} />
            <StatItem icon={HardDrive} label="Backups" value={stat.uBackups} />
            {stat.ipOwned > 0 && (
              <StatItem icon={Server} label="IP Addresses" value={stat.ipOwned} />
            )}
            {stat.uUsers > 0 && (
              <StatItem icon={Users} label="Users" value={stat.uUsers} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Item Component
function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-dark-card">
      <Icon className="w-4 h-4 text-gray-400" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-dark-muted truncate">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

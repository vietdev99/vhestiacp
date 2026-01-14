import { useAuth } from '../context/AuthContext';
import { Globe, Database, Mail, Clock, HardDrive, Users } from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const stats = [
    { name: 'Web Domains', value: '5', icon: Globe, color: 'bg-blue-500' },
    { name: 'Databases', value: '3', icon: Database, color: 'bg-green-500' },
    { name: 'Mail Domains', value: '2', icon: Mail, color: 'bg-purple-500' },
    { name: 'Cron Jobs', value: '8', icon: Clock, color: 'bg-orange-500' },
    { name: 'Backups', value: '4', icon: HardDrive, color: 'bg-cyan-500' },
  ];

  if (isAdmin) {
    stats.unshift({ name: 'Users', value: '12', icon: Users, color: 'bg-pink-500' });
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-dark-muted">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary">
            <Globe className="w-4 h-4 mr-2" />
            Add Web Domain
          </button>
          <button className="btn btn-secondary">
            <Database className="w-4 h-4 mr-2" />
            Add Database
          </button>
          <button className="btn btn-secondary">
            <Mail className="w-4 h-4 mr-2" />
            Add Mail Domain
          </button>
        </div>
      </div>
    </div>
  );
}

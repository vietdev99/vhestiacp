import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Search, Database, MoreVertical, HardDrive, Leaf } from 'lucide-react';

// Database type labels
const DB_TYPE_CONFIG = {
  mysql: { label: 'MariaDB', description: 'Manage your MariaDB/MySQL databases', api: '/api/databases', addPath: '/databases/add?type=mysql', badge: 'mysql' },
  pgsql: { label: 'PostgreSQL', description: 'Manage your PostgreSQL databases', api: '/api/databases', addPath: '/databases/add?type=pgsql', badge: 'pgsql' },
  mongodb: { label: 'MongoDB', description: 'Manage your MongoDB databases', api: '/api/databases/mongodb', addPath: '/databases/mongodb/add', badge: 'mongodb' }
};

export default function Databases() {
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const dbType = searchParams.get('type') || 'mysql';

  const typeConfig = DB_TYPE_CONFIG[dbType] || DB_TYPE_CONFIG.mysql;

  const { data, isLoading, error } = useQuery({
    queryKey: ['databases', dbType],
    queryFn: async () => {
      const res = await api.get(typeConfig.api, { params: { type: dbType } });
      return res.data.databases || [];
    }
  });

  const filteredDatabases = data?.filter(d =>
    d.database?.toLowerCase().includes(search.toLowerCase())
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
        Failed to load databases. Please try again.
      </div>
    );
  }

  // MongoDB has different columns
  const isMongoDB = dbType === 'mongodb';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {isMongoDB ? <Leaf className="w-6 h-6 text-green-600" /> : <Database className="w-6 h-6" />}
            {typeConfig.label}
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            {typeConfig.description}
          </p>
        </div>
        <Link to={typeConfig.addPath} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Database
        </Link>
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

      {/* Databases table */}
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
                  Type
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
                    <span className={`badge ${isMongoDB ? 'badge-success' : 'badge-info'}`}>
                      {typeConfig.badge}
                    </span>
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
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDatabases.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              {search ? 'No databases found matching your search.' : 'No databases yet. Add your first database to get started.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {filteredDatabases.length} {filteredDatabases.length === 1 ? 'database' : 'databases'}
      </div>
    </div>
  );
}

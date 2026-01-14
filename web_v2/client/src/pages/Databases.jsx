import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Search, Database, MoreVertical, HardDrive } from 'lucide-react';

export default function Databases() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['databases'],
    queryFn: async () => {
      const res = await api.get('/api/databases');
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Databases</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Manage your MySQL/MariaDB databases
          </p>
        </div>
        <Link to="/databases/add" className="btn btn-primary">
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
                  User
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                  Disk
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
              {filteredDatabases.map((item) => (
                <tr key={item.database} className="hover:bg-gray-50 dark:hover:bg-dark-border/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{item.database}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-dark-muted">
                    {item.DBUSER || '-'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="badge badge-info">{item.TYPE || 'mysql'}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-dark-muted">
                      <HardDrive className="w-4 h-4" />
                      {item.U_DISK || 0} MB
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {item.SUSPENDED === 'yes' ? (
                      <span className="badge badge-danger">Suspended</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
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

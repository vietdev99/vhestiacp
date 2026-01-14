import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Database, Settings, Server, RefreshCw, Loader2 } from 'lucide-react';

export default function DatabaseSettings() {
  const [activeTab, setActiveTab] = useState('mysql');

  const { data: systemInfo, isLoading } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    }
  });

  const installedServices = systemInfo?.installedServices || {};

  // Determine which tabs to show
  const tabs = [];
  if (installedServices.mysql) tabs.push({ id: 'mysql', name: 'MariaDB' });
  if (installedServices.pgsql) tabs.push({ id: 'pgsql', name: 'PostgreSQL' });
  if (installedServices.mongodb) tabs.push({ id: 'mongodb', name: 'MongoDB' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Database Installed</h2>
        <p className="text-gray-500 dark:text-dark-muted">
          Install a database server from the Services page to configure it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Database Settings</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Configure your database servers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-6">
        <div className="border-b border-gray-200 dark:border-dark-border">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-muted'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'mysql' && <MySQLSettings />}
          {activeTab === 'pgsql' && <PostgreSQLSettings />}
          {activeTab === 'mongodb' && <MongoDBSettings />}
        </div>
      </div>
    </div>
  );
}

function MySQLSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-medium">MariaDB / MySQL Configuration</h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          MariaDB configuration can be managed through the old panel at{' '}
          <a href="/edit/server/mysql/" className="underline font-medium">
            /edit/server/mysql/
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          <h4 className="font-medium mb-2">Config File</h4>
          <p className="text-sm text-gray-600 dark:text-dark-muted">/etc/mysql/my.cnf</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          <h4 className="font-medium mb-2">Service</h4>
          <p className="text-sm text-gray-600 dark:text-dark-muted">mariadb.service</p>
        </div>
      </div>
    </div>
  );
}

function PostgreSQLSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-medium">PostgreSQL Configuration</h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          PostgreSQL configuration can be managed through the old panel at{' '}
          <a href="/edit/server/pgsql/" className="underline font-medium">
            /edit/server/pgsql/
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 md:cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          <h4 className="font-medium mb-2">Config File</h4>
          <p className="text-sm text-gray-600 dark:text-dark-muted">/etc/postgresql/*/main/postgresql.conf</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          <h4 className="font-medium mb-2">Service</h4>
          <p className="text-sm text-gray-600 dark:text-dark-muted">postgresql.service</p>
        </div>
      </div>
    </div>
  );
}

function MongoDBSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-medium">MongoDB Configuration</h3>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-sm text-green-700 dark:text-green-300">
          MongoDB configuration can be managed through the old panel at{' '}
          <a href="/edit/server/mongodb/" className="underline font-medium">
            /edit/server/mongodb/
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          <h4 className="font-medium mb-2">Config File</h4>
          <p className="text-sm text-gray-600 dark:text-dark-muted">/etc/mongod.conf</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          <h4 className="font-medium mb-2">Service</h4>
          <p className="text-sm text-gray-600 dark:text-dark-muted">mongod.service</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Globe,
  BookOpen,
  Mail,
  Database,
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import clsx from 'clsx';

const tabs = [
  { key: 'cpu', label: 'CPU', icon: Cpu },
  { key: 'mem', label: 'RAM', icon: MemoryStick },
  { key: 'disk', label: 'Disk', icon: HardDrive },
  { key: 'net', label: 'Network', icon: Network },
  { key: 'web', label: 'Web', icon: Globe, service: 'web' },
  { key: 'dns', label: 'DNS', icon: BookOpen, service: 'dns' },
  { key: 'mail', label: 'Mail', icon: Mail, service: 'mail' },
  { key: 'db', label: 'DB', icon: Database, service: 'db' }
];

export default function ServerInfo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'cpu';

  // Get system info to check installed services
  const { data: systemInfo } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: async () => {
      const res = await api.get('/api/system/info');
      return res.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Get status for active tab
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['serverStatus', activeTab],
    queryFn: async () => {
      const res = await api.get(`/api/system/server/status/${activeTab}`);
      return res.data;
    },
    staleTime: 30 * 1000 // Cache for 30 seconds
  });

  // Filter tabs based on installed services
  const availableTabs = tabs.filter(tab => {
    if (!tab.service) return true;
    if (!systemInfo?.installedServices) return true;

    if (tab.service === 'web') return true; // Web is always available
    if (tab.service === 'dns') return systemInfo.installedServices.dns !== false;
    if (tab.service === 'mail') return systemInfo.installedServices.mail !== false;
    if (tab.service === 'db') return systemInfo.installedServices.db !== false;
    return true;
  });

  const handleTabChange = (key) => {
    setSearchParams({ tab: key });
  };

  // Process output for web tab (replace bgcolor styles)
  const processOutput = (output, type) => {
    if (!output) return '';

    if (type === 'web') {
      // Replace old bgcolor styles for dark mode compatibility
      return output
        .replace(/border="0"/g, 'border="1"')
        .replace(/bgcolor="#ffffff"/g, '')
        .replace(/bgcolor="#000000"/g, 'bgcolor="#282828"');
    }
    return output;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/statistics"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Server Status</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-dark-border">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : statusData?.error ? (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              <p>Unable to retrieve {activeTab.toUpperCase()} status</p>
              <p className="text-sm mt-2">{statusData.error}</p>
            </div>
          ) : !statusData?.output ? (
            <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
              <p>No data available for {activeTab.toUpperCase()} status</p>
            </div>
          ) : (
            <div className="console-output">
              {activeTab === 'web' ? (
                <div
                  className="overflow-auto"
                  dangerouslySetInnerHTML={{
                    __html: processOutput(statusData.output, activeTab)
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px]">
                  {processOutput(statusData.output, activeTab)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

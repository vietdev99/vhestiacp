import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  Globe,
  Database,
  Mail,
  Shield,
  Server,
  Download,
  Trash2,
  RefreshCw,
  Play,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  Cpu,
  HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Services() {
  const queryClient = useQueryClient();
  const [installing, setInstalling] = useState(null);
  const [uninstalling, setUninstalling] = useState(null);

  // Fetch services
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/api/services');
      return res.data;
    }
  });

  // Install mutation
  const installMutation = useMutation({
    mutationFn: async (serviceId) => {
      setInstalling(serviceId);
      await api.post(`/api/services/${serviceId}/install`);
    },
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries(['services']);
      toast.success('Service installed successfully');
      setInstalling(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to install service');
      setInstalling(null);
    }
  });

  // Uninstall mutation
  const uninstallMutation = useMutation({
    mutationFn: async (serviceId) => {
      setUninstalling(serviceId);
      await api.delete(`/api/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      toast.success('Service uninstalled successfully');
      setUninstalling(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to uninstall service');
      setUninstalling(null);
    }
  });

  // Restart mutation
  const restartMutation = useMutation({
    mutationFn: async (serviceId) => {
      await api.post(`/api/services/${serviceId}/restart`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      toast.success('Service restarted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to restart service');
    }
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'web': return Globe;
      case 'database': return Database;
      case 'mail':
      case 'queue': return Mail;
      case 'security': return Shield;
      default: return Server;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'web': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'database': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      case 'mail': return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
      case 'queue': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'security': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
    }
  };

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
        <p className="text-red-500">Failed to load services. {error.response?.data?.error || ''}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Install or uninstall system packages. Some packages may require server restart.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Categories */}
      {data?.categories?.map((category) => {
        const Icon = getCategoryIcon(category.services[0]?.category);

        return (
          <div key={category.name} className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {category.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.services.map((service) => (
                <div
                  key={service.id}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(service.category)}`}>
                        {(() => {
                          const SIcon = getCategoryIcon(service.category);
                          return <SIcon className="w-5 h-5" />;
                        })()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-dark-muted">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {service.installed ? (
                        service.running ? (
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Running
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            Stopped
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          Not Installed
                        </span>
                      )}
                    </div>

                    {/* Resource usage */}
                    {service.installed && service.running && (
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-muted">
                        <span className="flex items-center gap-1" title="CPU Usage">
                          <Cpu className="w-3 h-3" />
                          {service.cpu}%
                        </span>
                        <span className="flex items-center gap-1" title="Memory Usage">
                          <HardDrive className="w-3 h-3" />
                          {service.memory}MB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-dark-border flex items-center gap-2">
                    {service.installed ? (
                      <>
                        {service.canUninstall && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to uninstall ${service.name}?`)) {
                                uninstallMutation.mutate(service.id);
                              }
                            }}
                            disabled={uninstalling === service.id}
                            className="flex-1 btn btn-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                          >
                            {uninstalling === service.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-1" />
                            )}
                            Uninstall
                          </button>
                        )}
                        {!service.canUninstall && service.running && (
                          <button
                            onClick={() => restartMutation.mutate(service.id)}
                            disabled={restartMutation.isPending}
                            className="flex-1 btn btn-sm btn-secondary"
                          >
                            <RefreshCw className={`w-4 h-4 mr-1 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
                            Restart
                          </button>
                        )}
                      </>
                    ) : (
                      service.canInstall && (
                        <button
                          onClick={() => installMutation.mutate(service.id)}
                          disabled={installing === service.id}
                          className="flex-1 btn btn-sm btn-primary"
                        >
                          {installing === service.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-1" />
                          )}
                          Install
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

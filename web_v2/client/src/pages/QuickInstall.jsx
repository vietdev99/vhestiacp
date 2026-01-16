import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft,
  Package,
  Loader2,
  Globe,
  Mail,
  Lock,
  User,
  Folder,
  Database,
  Settings,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuickInstall() {
  const { domain } = useParams();
  const navigate = useNavigate();
  const [selectedApp, setSelectedApp] = useState(null);
  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(1); // 1 = select app, 2 = configure

  // Fetch available apps
  const { data: apps, isLoading: appsLoading } = useQuery({
    queryKey: ['quickinstall-apps'],
    queryFn: async () => {
      const res = await api.get('/api/quickinstall/apps');
      return res.data.apps;
    }
  });

  // Fetch app options when app is selected
  const { data: appOptions, isLoading: optionsLoading, refetch: refetchOptions } = useQuery({
    queryKey: ['quickinstall-options', selectedApp, domain],
    queryFn: async () => {
      const res = await api.get(`/api/quickinstall/options/${selectedApp}`, {
        params: { domain }
      });
      return res.data;
    },
    enabled: !!selectedApp && !!domain
  });

  // Pre-fill form with default values when options are loaded
  useEffect(() => {
    if (appOptions?.options) {
      const defaults = {};
      appOptions.options.forEach(opt => {
        if (opt.defaultValue && opt.defaultValue !== 'none') {
          defaults[opt.key] = opt.defaultValue;
        }
      });
      setFormData(defaults);
    }
  }, [appOptions]);

  // Install mutation
  const installMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/quickinstall/install', data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'App installed successfully!');
      navigate(`/web/${domain}/edit`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to install app');
    }
  });

  const handleSelectApp = (app) => {
    setSelectedApp(app.name);
    setStep(2);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    installMutation.mutate({
      domain,
      app: selectedApp,
      options: formData
    });
  };

  const getAppImage = (appName) => {
    if (!appName) return '';
    const name = appName.toLowerCase();
    const imageMap = {
      'nextcloud': 'nextcloud.png',
      'prestashop': 'prestashop.png',
      'opencart': 'opencart.png',
      'mediawiki': 'mediawiki.png',
      'dokuwiki': 'dokuwiki.png',
      'grav': 'grav.png',
      'flarum': 'flarum.png',
      'dolibarr': 'dolibarr.png',
      'namelessmc': 'namelessmc.png',
      'thirtybees': 'thirtybees.png',
      'vvveb': 'vvveb.png',
      'wordpress': 'wordpress.png',
      'joomla': 'joomla.png',
      'drupal': 'drupal.png',
      'laravel': 'laravel.png',
      'symfony': 'symfony.png'
    };
    const filename = imageMap[name] || `${name}.png`;
    return `https://raw.githubusercontent.com/hestiacp/hestiacp/main/web/images/${filename}`;
  };

  const getAppIcon = (appName) => {
    const icons = {
      'WordPress': '📝',
      'Laravel': '🔴',
      'Symfony': '⚫',
      'Drupal': '💧',
      'Joomla': '🔵',
      'Nextcloud': '☁️',
      'PrestaShop': '🛒',
      'OpenCart': '🛒',
      'MediaWiki': '📚',
      'DokuWiki': '📖',
      'Grav': '🚀',
      'Flarum': '💬',
      'Dolibarr': '📊',
      'NamelessMC': '🎮',
      'ThirtyBees': '🐝',
      'Vvveb': '🌐'
    };
    return icons[appName] || '📦';
  };

  const getFieldIcon = (key) => {
    if (key.includes('email')) return <Mail className="w-4 h-4" />;
    if (key.includes('password')) return <Lock className="w-4 h-4" />;
    if (key.includes('username') || key.includes('user')) return <User className="w-4 h-4" />;
    if (key.includes('directory') || key.includes('path')) return <Folder className="w-4 h-4" />;
    if (key.includes('database')) return <Database className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const formatFieldLabel = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (appsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to={step === 2 ? '#' : `/web/${domain}/edit`}
          onClick={(e) => {
            if (step === 2) {
              e.preventDefault();
              setStep(1);
              setSelectedApp(null);
            }
          }}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Quick Install App</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Install web application on <span className="font-medium text-gray-700 dark:text-gray-300">{domain}</span>
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          step === 1
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {step > 1 ? <Check className="w-4 h-4" /> : <span>1</span>}
          Select App
        </div>
        <div className="w-8 h-0.5 bg-gray-300 dark:bg-dark-border" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          step === 2
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
            : 'bg-gray-100 text-gray-500 dark:bg-dark-border dark:text-dark-muted'
        }`}>
          <span>2</span>
          Configure & Install
        </div>
      </div>

      {/* Step 1: Select App */}
      {step === 1 && (
        <div className="card p-6 bg-gray-50 dark:bg-dark-bg">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Quick Install App
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {apps?.map((app) => (
              <div
                key={app.name}
                className="flex flex-col items-center p-6 bg-white dark:bg-dark-card rounded shadow-sm border border-gray-200 dark:border-dark-border hover:shadow-md transition-shadow text-center group"
              >
                <div className="w-24 h-24 mb-4 flex items-center justify-center">
                  <img 
                    src={getAppImage(app.name)} 
                    alt={app.name} 
                    className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <span className="text-4xl hidden">{getAppIcon(app.name)}</span>
                </div>
                
                <h3 className="font-bold text-lg mb-1">{app.name}</h3>
                <p className="text-xs text-gray-500 dark:text-dark-muted mb-4">Version: {app.version}</p>
                
                <button
                  onClick={() => handleSelectApp(app)}
                  className="mt-auto px-6 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors uppercase tracking-wide w-full"
                >
                  Setup
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-dark-border">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-50 dark:bg-dark-bg rounded p-2 border border-gray-100 dark:border-dark-border">
               <img 
                  src={getAppImage(selectedApp)} 
                  alt={selectedApp}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
               <span className="text-4xl hidden">{getAppIcon(selectedApp)}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{selectedApp}</h2>
              <p className="text-gray-500 dark:text-dark-muted">
                Configure installation options
              </p>
            </div>
          </div>

          {optionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic options */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Basic Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appOptions?.options
                    ?.filter(opt => !opt.key.startsWith('database_'))
                    .map((opt) => (
                      <div key={opt.key}>
                        <label className="flex items-center gap-2 text-sm font-medium mb-1">
                          {getFieldIcon(opt.key)}
                          {formatFieldLabel(opt.key)}
                          {opt.required && <span className="text-red-500">*</span>}
                        </label>
                        {opt.type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name={opt.key}
                              checked={formData[opt.key] === 'true'}
                              onChange={handleChange}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
                          </label>
                        ) : opt.type === 'select' ? (
                          <input
                            type="text"
                            name={opt.key}
                            value={formData[opt.key] || ''}
                            onChange={handleChange}
                            className="input"
                            placeholder={opt.defaultValue || ''}
                            required={opt.required}
                          />
                        ) : (
                          <input
                            type={opt.type === 'password' ? 'password' : 'text'}
                            name={opt.key}
                            value={formData[opt.key] || ''}
                            onChange={handleChange}
                            className="input"
                            placeholder={opt.defaultValue || ''}
                            required={opt.required}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Database options */}
              {appOptions?.options?.some(opt => opt.key.startsWith('database_')) && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Database Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appOptions?.options
                      ?.filter(opt => opt.key.startsWith('database_'))
                      .map((opt) => (
                        <div key={opt.key}>
                          <label className="flex items-center gap-2 text-sm font-medium mb-1">
                            {formatFieldLabel(opt.key.replace('database_', ''))}
                          </label>
                          {opt.type === 'boolean' ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                name={opt.key}
                                checked={formData[opt.key] === 'true'}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {opt.key === 'database_create' ? 'Create new database automatically' : 'Enable'}
                              </span>
                            </label>
                          ) : (
                            <input
                              type={opt.type === 'password' ? 'password' : 'text'}
                              name={opt.key}
                              value={formData[opt.key] || ''}
                              onChange={handleChange}
                              className="input"
                              placeholder={opt.defaultValue !== 'none' ? opt.defaultValue : ''}
                              disabled={opt.key !== 'database_create' && formData.database_create === 'true'}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                  {formData.database_create === 'true' && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      A new database will be created automatically for this installation.
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedApp(null);
                  }}
                  className="btn btn-secondary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={installMutation.isPending}
                  className="btn btn-primary"
                >
                  {installMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Install {selectedApp}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

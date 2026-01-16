import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, AlertCircle, Loader2, Eye, EyeOff, RefreshCw, Server } from 'lucide-react';

export default function DatabaseAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Get instance and type from URL
  const instance = searchParams.get('instance') || 'default';
  const dbType = searchParams.get('type') || 'mysql';
  
  const [formData, setFormData] = useState({
    database: '',
    dbuser: '',
    password: '',
    type: dbType
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Determine API endpoint based on type
      let endpoint = '/api/databases';
      if (data.type === 'mysql') {
        endpoint = '/api/databases/mariadb';
      } else if (data.type === 'pgsql') {
        endpoint = '/api/databases/pgsql';
      }
      
      // Include instance in request
      await api.post(endpoint, {
        ...data,
        instance: instance
      });
    },
    onSuccess: () => {
      navigate(`/databases?type=${formData.type}&instance=${instance}`);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create database');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.database) {
      setError('Database name is required');
      return;
    }

    if (!formData.dbuser) {
      setError('Database user is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    createMutation.mutate(formData);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    setShowPassword(true);
  };

  const typeLabel = formData.type === 'mysql' ? 'MariaDB' : 'PostgreSQL';
  const backUrl = `/databases?type=${formData.type}&instance=${instance}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={backUrl} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Add {typeLabel} Database</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 dark:text-dark-muted">Creating in instance:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-medium">
              <Server className="w-3 h-3" />
              {instance}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Database name */}
          <div>
            <label htmlFor="database" className="block text-sm font-medium mb-1">
              Database Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="database"
              value={formData.database}
              onChange={(e) => setFormData({ ...formData, database: e.target.value })}
              className="input"
              placeholder="mydb"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Will be prefixed with your username</p>
          </div>

          {/* Database user */}
          <div>
            <label htmlFor="dbuser" className="block text-sm font-medium mb-1">
              Database User <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="dbuser"
              value={formData.dbuser}
              onChange={(e) => setFormData({ ...formData, dbuser: e.target.value })}
              className="input"
              placeholder="myuser"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Will be prefixed with your username</p>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="btn btn-secondary"
                title="Generate password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Type - Hidden, controlled by URL */}
          <input type="hidden" name="type" value={formData.type} />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Database'
              )}
            </button>
            <Link to={backUrl} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

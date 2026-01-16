import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, Eye, EyeOff, RefreshCw, Leaf, Server } from 'lucide-react';

export default function MongoDBAdd() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const username = user?.username || '';
  const [searchParams] = useSearchParams();
  const instance = searchParams.get('instance') || 'default';

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    database: '',
    password: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Include instance in API call
      await api.post('/api/databases/mongodb', { ...data, instance });
    },
    onSuccess: () => {
      navigate(`/databases?type=mongodb&instance=${encodeURIComponent(instance)}`);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create MongoDB database');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.database) {
      setError('Database name is required');
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/databases?type=mongodb&instance=${encodeURIComponent(instance)}`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="w-6 h-6 text-green-600" />
            Add MongoDB Database
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1 flex items-center gap-2">
            Creating in instance: 
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm font-medium">
              <Server className="w-3 h-3" />
              {instance}
            </span>
          </p>
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
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-border text-gray-500 dark:text-dark-muted text-sm">
                {username}_
              </span>
              <input
                type="text"
                id="database"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                className="input rounded-l-none flex-1"
                placeholder="mydb"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              A user with the same name will be created automatically
            </p>
          </div>

          {/* Password (optional) */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder="Leave empty for auto-generated"
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
            <p className="text-xs text-gray-500 mt-1">
              If left empty, a random password will be generated
            </p>
          </div>

          {/* Info box */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">MongoDB Database Info</h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Database and user will have the same name: <strong>{username}_{formData.database || 'dbname'}</strong></li>
              <li>• User will have readWrite role on this database</li>
              <li>• Connection string will be provided after creation</li>
            </ul>
          </div>

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
            <Link to={`/databases?type=mongodb&instance=${encodeURIComponent(instance)}`} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

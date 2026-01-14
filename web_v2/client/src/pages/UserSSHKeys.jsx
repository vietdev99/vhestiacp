import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { ArrowLeft, Plus, Trash2, Key, AlertCircle, CheckCircle, Copy } from 'lucide-react';

export default function UserSSHKeys() {
  const { username } = useParams();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch SSH keys
  const { data: keys, isLoading } = useQuery({
    queryKey: ['ssh-keys', username],
    queryFn: async () => {
      const res = await api.get(`/api/users/${username}/ssh-keys`);
      return res.data.keys;
    }
  });

  // Add key mutation
  const addMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/api/users/${username}/ssh-keys`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ssh-keys', username]);
      setShowAdd(false);
      setNewKey('');
      setKeyName('');
      setSuccess('SSH key added successfully');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to add SSH key');
    }
  });

  // Delete key mutation
  const deleteMutation = useMutation({
    mutationFn: async (keyId) => {
      await api.delete(`/api/users/${username}/ssh-keys/${encodeURIComponent(keyId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ssh-keys', username]);
      setSuccess('SSH key removed');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to remove SSH key');
    }
  });

  const handleAddKey = (e) => {
    e.preventDefault();
    setError('');

    if (!newKey.trim()) {
      setError('SSH key is required');
      return;
    }

    // Basic validation
    if (!newKey.startsWith('ssh-') && !newKey.startsWith('ecdsa-') && !newKey.startsWith('sk-')) {
      setError('Invalid SSH key format. Key should start with ssh-rsa, ssh-ed25519, ecdsa-sha2-*, or similar.');
      return;
    }

    addMutation.mutate({ key: newKey.trim(), name: keyName.trim() });
  };

  const handleDelete = (keyId) => {
    if (confirm('Are you sure you want to remove this SSH key?')) {
      deleteMutation.mutate(keyId);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to={`/users/${username}/edit`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">SSH Keys</h1>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Manage SSH keys for {username}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add SSH Key
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Add Key Form */}
      {showAdd && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New SSH Key</h3>
          <form onSubmit={handleAddKey} className="space-y-4">
            <div>
              <label htmlFor="keyName" className="block text-sm font-medium mb-1">
                Key Name (optional)
              </label>
              <input
                type="text"
                id="keyName"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="input"
                placeholder="My Laptop, Work PC, etc."
              />
            </div>
            <div>
              <label htmlFor="sshKey" className="block text-sm font-medium mb-1">
                Public Key <span className="text-red-500">*</span>
              </label>
              <textarea
                id="sshKey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="input min-h-[120px] font-mono text-sm"
                placeholder="ssh-rsa AAAAB3NzaC1... or ssh-ed25519 AAAAC3..."
                required
              />
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
                Paste your public SSH key here. Usually found in ~/.ssh/id_rsa.pub or ~/.ssh/id_ed25519.pub
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="btn btn-primary"
              >
                {addMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add Key'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setNewKey('');
                  setKeyName('');
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys List */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : keys && keys.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {keys.map((key, index) => (
              <div key={key.id || index} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-border/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Key className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {key.ID || key.id || `Key ${index + 1}`}
                      </p>
                      {key.KEY && (
                        <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
                          {key.KEY}
                        </p>
                      )}
                      {key.MD5 && (
                        <p className="text-xs text-gray-400 dark:text-dark-muted font-mono mt-1">
                          MD5: {key.MD5}
                        </p>
                      )}
                      {key.PUB && (
                        <p className="text-xs text-gray-400 dark:text-dark-muted font-mono mt-1 truncate">
                          {key.PUB.substring(0, 80)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {key.PUB && (
                      <button
                        onClick={() => copyToClipboard(key.PUB)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-500"
                        title="Copy public key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(key.ID || key.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                      title="Remove key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-dark-muted">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No SSH keys configured.</p>
            <p className="text-sm mt-1">Add an SSH key to enable passwordless login.</p>
          </div>
        )}
      </div>
    </div>
  );
}

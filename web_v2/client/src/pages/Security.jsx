import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Security() {
  const queryClient = useQueryClient();
  const [setupStep, setSetupStep] = useState(null); // null, 'qr', 'verify', 'backup'
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Get 2FA status
  const { data: status, isLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const res = await api.get('/api/auth/2fa/status');
      return res.data;
    }
  });

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/auth/2fa/setup');
      return res.data;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setSetupStep('qr');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to setup 2FA');
    }
  });

  // Verify 2FA mutation
  const verifyMutation = useMutation({
    mutationFn: async (code) => {
      const res = await api.post('/api/auth/2fa/verify', { code });
      return res.data;
    },
    onSuccess: () => {
      setSetupStep('backup');
      queryClient.invalidateQueries(['2fa-status']);
      toast.success('Two-factor authentication enabled!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Invalid code');
    }
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async (password) => {
      const res = await api.delete('/api/auth/2fa', { data: { password } });
      return res.data;
    },
    onSuccess: () => {
      setShowDisableModal(false);
      setDisablePassword('');
      queryClient.invalidateQueries(['2fa-status']);
      toast.success('Two-factor authentication disabled');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    }
  });

  // Regenerate backup codes mutation
  const regenerateMutation = useMutation({
    mutationFn: async (password) => {
      const res = await api.post('/api/auth/2fa/regenerate-backup', { password });
      return res.data;
    },
    onSuccess: (data) => {
      setSetupData(prev => ({ ...prev, backupCodes: data.backupCodes }));
      setShowBackupCodes(true);
      queryClient.invalidateQueries(['2fa-status']);
      toast.success('Backup codes regenerated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate codes');
    }
  });

  const handleCopyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
      toast.success('Backup codes copied to clipboard');
    }
  };

  const finishSetup = () => {
    setSetupStep(null);
    setSetupData(null);
    setVerifyCode('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/users" className="btn btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-7 h-7" />
          Security Settings
        </h1>
      </div>

      {/* 2FA Section */}
      <div className="card">
        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={clsx(
                'p-3 rounded-lg',
                status?.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-dark-border'
              )}>
                <Smartphone className={clsx(
                  'w-6 h-6',
                  status?.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                )} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-500 dark:text-dark-muted">
                  {status?.enabled 
                    ? `Enabled • ${status.backupCodesRemaining} backup codes remaining`
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            {status?.enabled ? (
              <button
                onClick={() => setShowDisableModal(true)}
                className="btn btn-danger"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
                className="btn btn-primary"
              >
                {setupMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {/* Setup Flow */}
        {setupStep === 'qr' && setupData && (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code
              </p>
              <div className="inline-block p-4 bg-white rounded-lg">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-dark-muted mb-1">Or enter manually:</p>
                <code className="text-sm bg-gray-100 dark:bg-dark-border px-3 py-1 rounded">
                  {setupData.secret}
                </code>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setSetupStep(null); setSetupData(null); }} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={() => setSetupStep('verify')} className="btn btn-primary">
                Next
              </button>
            </div>
          </div>
        )}

        {setupStep === 'verify' && (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Verify Code</h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="form-input w-40 text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSetupStep('qr')} className="btn btn-secondary">
                Back
              </button>
              <button
                onClick={() => verifyMutation.mutate(verifyCode)}
                disabled={verifyCode.length !== 6 || verifyMutation.isPending}
                className="btn btn-primary"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Verify & Enable
              </button>
            </div>
          </div>
        )}

        {setupStep === 'backup' && setupData?.backupCodes && (
          <div className="p-6 space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Save Your Backup Codes</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    These codes can be used to access your account if you lose your authenticator device.
                    Store them somewhere safe!
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {setupData.backupCodes.map((code, index) => (
                <code key={index} className="text-center py-2 bg-gray-100 dark:bg-dark-border rounded font-mono">
                  {code}
                </code>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={handleCopyBackupCodes} className="btn btn-secondary">
                {copiedCodes ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copiedCodes ? 'Copied!' : 'Copy Codes'}
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={finishSetup} className="btn btn-primary">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Regenerate backup codes for enabled 2FA */}
        {status?.enabled && !setupStep && (
          <div className="p-6 border-t border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Backup Codes</p>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">
                    {status.backupCodesRemaining} codes remaining
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const password = prompt('Enter your password to regenerate backup codes:');
                  if (password) {
                    regenerateMutation.mutate(password);
                  }
                }}
                disabled={regenerateMutation.isPending}
                className="btn btn-secondary btn-sm"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Disable Two-Factor Authentication</h3>
            <p className="text-gray-500 dark:text-dark-muted mb-4">
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </p>
            <div className="relative mb-4">
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Your password"
                className="form-input w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDisableModal(false); setDisablePassword(''); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => disableMutation.mutate(disablePassword)}
                disabled={!disablePassword || disableMutation.isPending}
                className="btn btn-danger"
              >
                {disableMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

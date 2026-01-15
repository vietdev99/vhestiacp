import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import {
  Database, Settings, Server, Save, Key, Upload, Download,
  CheckCircle, XCircle, AlertTriangle, Loader2, Leaf, Info, ExternalLink,
  Play, Square, RefreshCw, Trash2, Plus
} from 'lucide-react';

export default function DatabaseSettings() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'mysql');

  const { data: rcloneRemotes } = useQuery({
    queryKey: ['rclone-remotes'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/rclone/remotes');
        return res.data.remotes || [];
      } catch (e) {
        return [];
      }
    }
  });

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
  if (installedServices.mysql) tabs.push({ id: 'mysql', name: 'MariaDB', icon: Database });
  if (installedServices.pgsql) tabs.push({ id: 'pgsql', name: 'PostgreSQL', icon: Database });
  if (installedServices.mongodb) tabs.push({ id: 'mongodb', name: 'MongoDB', icon: Leaf });

  // Set default tab to first available
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs.length]);

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
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'mysql' && <MySQLSettings />}
          {activeTab === 'pgsql' && <PostgreSQLSettings />}
          {activeTab === 'mongodb' && <MongoDBSettings rcloneRemotes={rcloneRemotes} />}
        </div>
      </div>
    </div>
  );
}

function MySQLSettings() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState('');
  const [restartAfterSave, setRestartAfterSave] = useState(true);

  // Replication settings
  const [replicationMode, setReplicationMode] = useState('standalone');
  const [role, setRole] = useState('master');
  const [serverId, setServerId] = useState(1);
  const [binlogFormat, setBinlogFormat] = useState('ROW');
  const [replicationUser, setReplicationUser] = useState('repl');
  const [replicationPassword, setReplicationPassword] = useState('');

  // Slave settings
  const [masterHost, setMasterHost] = useState('');
  const [masterPort, setMasterPort] = useState(3306);
  const [masterUser, setMasterUser] = useState('repl');
  const [masterPassword, setMasterPassword] = useState('');
  const [masterLogFile, setMasterLogFile] = useState('');
  const [masterLogPos, setMasterLogPos] = useState('');

  // Fetch MariaDB config
  const { data: mariadbConfig, isLoading } = useQuery({
    queryKey: ['mariadb-config'],
    queryFn: async () => {
      const res = await api.get('/api/mariadb/config');
      return res.data;
    }
  });

  // Initialize form with fetched data
  useEffect(() => {
    if (mariadbConfig) {
      setConfig(mariadbConfig.config || '');
      if (mariadbConfig.settings) {
        setServerId(mariadbConfig.settings.serverId || 1);
        setBinlogFormat(mariadbConfig.settings.binlogFormat || 'ROW');
        if (mariadbConfig.settings.logBin) {
          setReplicationMode(mariadbConfig.replicationStatus?.isSlave ? 'master-slave' :
            mariadbConfig.settings.replicationMode === 'master' ? 'master-slave' : 'standalone');
        }
      }
    }
  }, [mariadbConfig]);

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/mariadb/config', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mariadb-config']);
    }
  });

  // Setup replication mutation
  const setupReplicationMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/mariadb/replication/setup', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mariadb-config']);
    }
  });

  // Start slave mutation
  const startSlaveMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/mariadb/replication/start-slave', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mariadb-config']);
    }
  });

  // Stop slave mutation
  const stopSlaveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/mariadb/replication/stop-slave');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mariadb-config']);
    }
  });

  // Handle config save
  const handleSaveConfig = () => {
    saveMutation.mutate({
      config,
      configPath: mariadbConfig?.configPath,
      restart: restartAfterSave
    });
  };

  // Handle replication setup
  const handleSetupReplication = () => {
    setupReplicationMutation.mutate({
      mode: replicationMode,
      role,
      serverId,
      binlogFormat,
      replicationUser,
      replicationPassword
    });
  };

  // Handle start slave
  const handleStartSlave = () => {
    startSlaveMutation.mutate({
      masterHost,
      masterPort,
      masterUser,
      masterPassword,
      masterLogFile: masterLogFile || undefined,
      masterLogPos: masterLogPos ? parseInt(masterLogPos) : undefined
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  const replicationStatus = mariadbConfig?.replicationStatus;

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-dark-muted">Status:</span>
          {mariadbConfig?.status === 'running' ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-4 h-4" />
              Stopped
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-dark-muted">Version:</span>
          <span className="text-sm">{mariadbConfig?.version || 'Unknown'}</span>
        </div>
        {replicationStatus?.isMaster && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Master</span>
        )}
        {replicationStatus?.isSlave && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">Slave</span>
        )}
      </div>

      {/* Replication Status */}
      {(replicationStatus?.isMaster || replicationStatus?.isSlave) && (
        <div className="p-4 border border-gray-200 dark:border-dark-border rounded-lg space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Server className="w-4 h-4" />
            Replication Status
          </h4>

          {replicationStatus?.masterStatus && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Binary Log File:</span>
                <span className="ml-2 font-mono">{replicationStatus.masterStatus.file}</span>
              </div>
              <div>
                <span className="text-gray-500">Position:</span>
                <span className="ml-2 font-mono">{replicationStatus.masterStatus.position}</span>
              </div>
            </div>
          )}

          {replicationStatus?.slaveStatus && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Master Host:</span>
                  <span className="ml-2 font-mono">{replicationStatus.slaveStatus.masterHost}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">IO Thread:</span>
                  {replicationStatus.slaveStatus.slaveIORunning ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">SQL Thread:</span>
                  {replicationStatus.slaveStatus.slaveSQLRunning ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Lag:</span>
                  <span className="ml-2">{replicationStatus.slaveStatus.secondsBehindMaster}s</span>
                </div>
              </div>

              {replicationStatus.slaveStatus.lastError && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {replicationStatus.slaveStatus.lastError}
                </div>
              )}

              <div className="flex gap-2">
                {replicationStatus.slaveStatus.slaveIORunning ? (
                  <button
                    onClick={() => stopSlaveMutation.mutate()}
                    disabled={stopSlaveMutation.isPending}
                    className="btn btn-secondary btn-sm"
                  >
                    {stopSlaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Stop Slave
                  </button>
                ) : (
                  <button
                    onClick={() => startSlaveMutation.mutate({
                      masterHost: replicationStatus.slaveStatus.masterHost,
                      masterUser,
                      masterPassword: masterPassword || 'repl_password'
                    })}
                    disabled={startSlaveMutation.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {startSlaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Start Slave
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Config Editor */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Configuration File ({mariadbConfig?.configPath || '/etc/mysql/my.cnf'})
        </label>
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full h-48 font-mono text-sm p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          spellCheck={false}
        />
        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={restartAfterSave}
              onChange={(e) => setRestartAfterSave(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm">Restart service after saving</span>
          </label>
          <button
            onClick={handleSaveConfig}
            disabled={saveMutation.isPending}
            className="btn btn-primary"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {/* Replication Setup */}
      <div className="border-t border-gray-200 dark:border-dark-border pt-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-500" />
          Replication Configuration
        </h3>

        <div className="space-y-4">
          {/* Replication Mode */}
          <div>
            <label className="block text-sm font-medium mb-1">Replication Mode</label>
            <select
              value={replicationMode}
              onChange={(e) => setReplicationMode(e.target.value)}
              className="input"
            >
              <option value="standalone">Standalone (No Replication)</option>
              <option value="master-slave">Master-Slave</option>
              <option value="master-master">Master-Master</option>
            </select>
          </div>

          {replicationMode !== 'standalone' && (
            <div className="ml-4 pl-4 border-l-4 border-blue-500 space-y-4">
              {/* Role selection for master-slave */}
              {replicationMode === 'master-slave' && (
                <div>
                  <label className="block text-sm font-medium mb-1">This Server Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="input"
                  >
                    <option value="master">Master (Primary)</option>
                    <option value="slave">Slave (Replica)</option>
                  </select>
                </div>
              )}

              {/* Server ID */}
              <div>
                <label className="block text-sm font-medium mb-1">Server ID</label>
                <input
                  type="number"
                  value={serverId}
                  onChange={(e) => setServerId(parseInt(e.target.value))}
                  min={1}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Each server in the replication topology must have a unique ID
                </p>
              </div>

              {/* Binlog Format */}
              <div>
                <label className="block text-sm font-medium mb-1">Binary Log Format</label>
                <select
                  value={binlogFormat}
                  onChange={(e) => setBinlogFormat(e.target.value)}
                  className="input"
                >
                  <option value="ROW">ROW (Recommended)</option>
                  <option value="STATEMENT">STATEMENT</option>
                  <option value="MIXED">MIXED</option>
                </select>
              </div>

              {/* Master settings */}
              {(role === 'master' || replicationMode === 'master-master') && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300">Master Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Replication User</label>
                      <input
                        type="text"
                        value={replicationUser}
                        onChange={(e) => setReplicationUser(e.target.value)}
                        placeholder="repl"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Replication Password</label>
                      <input
                        type="password"
                        value={replicationPassword}
                        onChange={(e) => setReplicationPassword(e.target.value)}
                        placeholder="Enter password for new user"
                        className="input"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    This will create a replication user with REPLICATION SLAVE privileges
                  </p>
                </div>
              )}

              {/* Slave settings */}
              {(role === 'slave' || replicationMode === 'master-master') && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-3">
                  <h4 className="font-medium text-purple-700 dark:text-purple-300">
                    {replicationMode === 'master-master' ? 'Connect to Other Master' : 'Connect to Master'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Master Host</label>
                      <input
                        type="text"
                        value={masterHost}
                        onChange={(e) => setMasterHost(e.target.value)}
                        placeholder="192.168.1.100"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Master Port</label>
                      <input
                        type="number"
                        value={masterPort}
                        onChange={(e) => setMasterPort(parseInt(e.target.value))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Replication User</label>
                      <input
                        type="text"
                        value={masterUser}
                        onChange={(e) => setMasterUser(e.target.value)}
                        placeholder="repl"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Replication Password</label>
                      <input
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Binary Log File <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={masterLogFile}
                        onChange={(e) => setMasterLogFile(e.target.value)}
                        placeholder="mariadb-bin.000001"
                        className="input font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Log Position <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={masterLogPos}
                        onChange={(e) => setMasterLogPos(e.target.value)}
                        placeholder="4"
                        className="input font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Leave log file/position empty to use GTID-based replication (recommended for MariaDB 10.0+)
                  </p>
                </div>
              )}

              {/* Setup Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSetupReplication}
                  disabled={setupReplicationMutation.isPending}
                  className="btn btn-primary"
                >
                  {setupReplicationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Setup Replication Config
                    </>
                  )}
                </button>

                {role === 'slave' && (
                  <button
                    onClick={handleStartSlave}
                    disabled={startSlaveMutation.isPending || !masterHost || !masterPassword}
                    className="btn btn-secondary"
                  >
                    {startSlaveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Start Slave Replication
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Replication Setup Tips</h4>
        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
          <li><strong>Master-Slave:</strong> One master handles writes, slaves handle reads. Good for read scaling.</li>
          <li><strong>Master-Master:</strong> Both servers can accept writes. Use with caution - requires careful conflict handling.</li>
          <li>Ensure both servers can communicate on port 3306 (check firewall rules)</li>
          <li>For initial sync, consider using mysqldump on master and importing on slave</li>
          <li>Always test replication in a staging environment first</li>
        </ul>
      </div>

      {/* Status Messages */}
      {saveMutation.isSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Configuration saved successfully
        </div>
      )}
      {saveMutation.isError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <XCircle className="w-4 h-4 inline mr-2" />
          {saveMutation.error?.response?.data?.error || 'Failed to save configuration'}
        </div>
      )}
      {setupReplicationMutation.isSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Replication configuration applied. Service restarted.
        </div>
      )}
      {setupReplicationMutation.isError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <XCircle className="w-4 h-4 inline mr-2" />
          {setupReplicationMutation.error?.response?.data?.error || 'Failed to setup replication'}
        </div>
      )}
      {startSlaveMutation.isSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Slave replication started successfully
        </div>
      )}
      {startSlaveMutation.isError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <XCircle className="w-4 h-4 inline mr-2" />
          {startSlaveMutation.error?.response?.data?.error || 'Failed to start slave replication'}
        </div>
      )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

// MongoDB Instance Manager Component with Tabs
function MongoDBInstanceManager({ rcloneRemotes = [] }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeInstance, setActiveInstance] = useState(null);
  const [newInstance, setNewInstance] = useState({ name: '', port: '27018', clusterMode: 'standalone', replicaSetName: 'rs0' });
  const [portError, setPortError] = useState('');

  // Fetch instances
  const { data: instancesData, isLoading, refetch } = useQuery({
    queryKey: ['mongodb-instances'],
    queryFn: async () => {
      const res = await api.get('/api/mongodb/instances');
      return res.data;
    },
    refetchInterval: 10000
  });

  const instances = instancesData?.instances || [];

  // Config editing state for selected instance
  const [editConfig, setEditConfig] = useState({
    dataDir: '',
    clusterMode: 'standalone',
    replicaSetName: 'rs0',
    nodeRole: 'primary',
    shardRole: 'shardsvr',
    keyfilePath: '',
    // PBM settings
    pbm: {
      enabled: false,
      type: 'logical',
      storage: 'filesystem',
      path: '/var/lib/pbm/backups',
      scheduleType: 'daily',
      time: '02:00'
    }
  });
  const [configText, setConfigText] = useState('');
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [showPbmSettings, setShowPbmSettings] = useState(false);
  const [restartAfterSave, setRestartAfterSave] = useState(true);

  // Fetch config for selected instance
  const { data: instanceConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['mongodb-instance-config', activeInstance],
    queryFn: async () => {
      if (!activeInstance) return null;
      // For default instance, use the main config endpoint
      if (activeInstance === 'default') {
        const res = await api.get('/api/mongodb/config');
        return res.data;
      }
      // For custom instances, read their config file
      const res = await api.get(`/api/mongodb/instances/${activeInstance}`);
      return res.data;
    },
    enabled: !!activeInstance
  });

  // Update edit state when instance config loads
  useEffect(() => {
    if (instanceConfig) {
      const settings = instanceConfig.settings || {};
      setEditConfig({
        dataDir: instanceConfig.dataDir || settings.dataDir || '',
        clusterMode: instanceConfig.clusterMode || settings.clusterMode || 'standalone',
        replicaSetName: instanceConfig.replicaSetName || settings.replicaSetName || 'rs0',
        nodeRole: instanceConfig.nodeRole || settings.nodeRole || 'primary',
        shardRole: instanceConfig.shardRole || settings.shardRole || 'shardsvr',
        keyfilePath: instanceConfig.keyfilePath || settings.keyfilePath || '',
        pbm: instanceConfig.pbm || settings.pbm || {
          enabled: false,
          type: 'logical',
          storage: 'filesystem',
          path: '/var/lib/pbm/backups',
          scheduleType: 'daily',
          time: '02:00'
        }
      });
      setConfigText(instanceConfig.config || '');
    }
  }, [instanceConfig]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      if (activeInstance === 'default') {
        // Use existing config save endpoint for default
        const res = await api.post('/api/mongodb/config', {
          config: configData.configText,
          restart: restartAfterSave,
          ...configData.settings
        });
        return res.data;
      }
      // For custom instances - update their config
      const res = await api.post(`/api/mongodb/instances/${activeInstance}/config`, {
        config: configData.configText,
        restart: restartAfterSave,
        settings: configData.settings
      });
      return res.data;
    },
    onSuccess: () => {
      refetch();
      refetchConfig();
      // Refetch status again after a delay to catch service restart
      setTimeout(() => refetch(), 2000);
      setTimeout(() => refetch(), 5000);
    }
  });
  
  // Set active instance to first one if not set
  useEffect(() => {
    if (instances.length > 0 && !activeInstance) {
      setActiveInstance(instances[0].name);
    }
  }, [instances, activeInstance]);

  // Check port availability
  const checkPort = async (port) => {
    try {
      const res = await api.post('/api/mongodb/instances/check-port', { port });
      if (!res.data.available) {
        setPortError(`Port ${port} is already in use`);
      } else {
        setPortError('');
      }
    } catch {
      setPortError('');
    }
  };

  // Create instance mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/mongodb/instances', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      setShowAddDialog(false);
      setNewInstance({ name: '', port: '27018', clusterMode: 'standalone', replicaSetName: 'rs0' });
      setActiveInstance(variables.name);
      refetch();
    }
  });

  // Instance action mutations
  const startMutation = useMutation({
    mutationFn: async (name) => api.post(`/api/mongodb/instances/${name}/start`),
    onSuccess: () => refetch()
  });

  const stopMutation = useMutation({
    mutationFn: async (name) => api.post(`/api/mongodb/instances/${name}/stop`),
    onSuccess: () => refetch()
  });

  const restartMutation = useMutation({
    mutationFn: async (name) => api.post(`/api/mongodb/instances/${name}/restart`),
    onSuccess: () => refetch()
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ name, force }) => api.delete(`/api/mongodb/instances/${name}?force=${force}`),
    onSuccess: (_, { name }) => {
      refetch();
      if (activeInstance === name) {
        setActiveInstance(instances.find(i => i.name !== name)?.name || null);
      }
    }
  });

  const handleAddInstance = () => {
    if (!newInstance.name || !newInstance.port) return;
    if (portError) return;
    createMutation.mutate(newInstance);
  };

  const selectedInstance = instances.find(i => i.name === activeInstance);

  return (
    <div className="space-y-4">
      {/* Instance Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border">
        <nav className="flex -mb-px overflow-x-auto">
          {instances.map((instance) => (
            <button
              key={instance.name}
              onClick={() => setActiveInstance(instance.name)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeInstance === instance.name
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-muted'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${instance.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
              {instance.name}
              <span className="text-xs text-gray-400">:{instance.port}</span>
            </button>
          ))}
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-primary-600 border-b-2 border-transparent"
            title="Add Instance"
          >
            <Plus className="w-4 h-4" />
          </button>
        </nav>
      </div>

      {/* Add Instance Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 w-full max-w-md m-4">
            <h4 className="text-lg font-medium mb-4">Add MongoDB Instance</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Instance Name *</label>
                <input
                  type="text"
                  value={newInstance.name}
                  onChange={(e) => setNewInstance({...newInstance, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})}
                  className="input"
                  placeholder="my-prod-db"
                />
                <p className="text-xs text-gray-500 mt-1">Letters, numbers, dashes, underscores only</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Port *</label>
                <input
                  type="number"
                  value={newInstance.port}
                  onChange={(e) => {
                    setNewInstance({...newInstance, port: e.target.value});
                    checkPort(e.target.value);
                  }}
                  className={`input ${portError ? 'border-red-500' : ''}`}
                  placeholder="27018"
                  min="1024"
                  max="65535"
                />
                {portError && <p className="text-xs text-red-500 mt-1">{portError}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Cluster Mode</label>
                <select
                  value={newInstance.clusterMode}
                  onChange={(e) => setNewInstance({...newInstance, clusterMode: e.target.value})}
                  className="input"
                >
                  <option value="standalone">Standalone</option>
                  <option value="replicaset">ReplicaSet</option>
                  <option value="sharding">Sharding</option>
                </select>
              </div>
              
              {newInstance.clusterMode !== 'standalone' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Replica Set Name</label>
                  <input
                    type="text"
                    value={newInstance.replicaSetName}
                    onChange={(e) => setNewInstance({...newInstance, replicaSetName: e.target.value})}
                    className="input"
                    placeholder="rs0"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInstance}
                disabled={!newInstance.name || !newInstance.port || portError || createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  'Create Instance'
                )}
              </button>
            </div>
            
            {createMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                {createMutation.error?.response?.data?.error || 'Failed to create instance'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Instance Details */}
      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : instances.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-dark-border rounded-lg">
          <Database className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-dark-muted">No MongoDB instances created yet</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="btn btn-primary mt-4"
          >
            + Create First Instance
          </button>
        </div>
      ) : selectedInstance ? (
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
          {/* Instance Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${selectedInstance.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <h4 className="font-medium text-lg">{selectedInstance.name}</h4>
                <p className="text-sm text-gray-500 dark:text-dark-muted">
                  Port: {selectedInstance.port} | Mode: {selectedInstance.clusterMode}
                  {selectedInstance.replicaSetName && ` | RS: ${selectedInstance.replicaSetName}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedInstance.status === 'running' ? (
                <>
                  <button
                    onClick={() => restartMutation.mutate(selectedInstance.name)}
                    disabled={restartMutation.isPending}
                    className="btn btn-secondary btn-sm"
                    title="Restart"
                  >
                    {restartMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Restart</>}
                  </button>
                  <button
                    onClick={() => stopMutation.mutate(selectedInstance.name)}
                    disabled={stopMutation.isPending}
                    className="btn btn-secondary btn-sm"
                    title="Stop"
                  >
                    {stopMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Square className="w-4 h-4" /> Stop</>}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startMutation.mutate(selectedInstance.name)}
                  disabled={startMutation.isPending}
                  className="btn btn-primary btn-sm"
                  title="Start"
                >
                  {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Start</>}
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(`Delete instance "${selectedInstance.name}"?\n\nThis will stop the service and remove configuration.\nData directory will be preserved (use CLI with --force to delete data).`)) {
                    deleteMutation.mutate({ name: selectedInstance.name, force: false });
                  }
                }}
                disabled={deleteMutation.isPending}
                className="btn btn-danger btn-sm"
                title="Delete"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete</>}
              </button>
            </div>
          </div>
          
          {/* Instance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-white dark:bg-dark-card rounded-lg">
              <span className="text-xs text-gray-500 uppercase">Status</span>
              <p className={`font-medium ${selectedInstance.status === 'running' ? 'text-green-600' : 'text-red-600'}`}>
                {selectedInstance.status === 'running' ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-card rounded-lg">
              <span className="text-xs text-gray-500 uppercase">Memory</span>
              <p className="font-medium">{selectedInstance.memory || 'N/A'}</p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-card rounded-lg">
              <span className="text-xs text-gray-500 uppercase">Data Size</span>
              <p className="font-medium">{selectedInstance.dataSize || 'N/A'}</p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-card rounded-lg">
              <span className="text-xs text-gray-500 uppercase">Service</span>
              <p className="font-medium text-sm">{selectedInstance.serviceName}</p>
            </div>
          </div>
          
          {/* Data Path */}
          <div className="mt-4 p-3 bg-white dark:bg-dark-card rounded-lg">
            <span className="text-xs text-gray-500 uppercase">Data Directory</span>
            <p className="font-mono text-sm">{selectedInstance.dataDir}</p>
          </div>

          {/* Instance Configuration */}
          <div className="mt-4 p-3 bg-white dark:bg-dark-card rounded-lg">
            <span className="text-xs text-gray-500 uppercase">Configuration File</span>
            <p className="font-mono text-sm">{selectedInstance.configPath}</p>
          </div>

          {/* Cluster Info */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-white dark:bg-dark-card rounded-lg">
              <span className="text-xs text-gray-500 uppercase">Cluster Mode</span>
            <p className="font-medium capitalize">{selectedInstance.clusterMode}</p>
            </div>
            {selectedInstance.replicaSetName && (
              <div className="p-3 bg-white dark:bg-dark-card rounded-lg">
                <span className="text-xs text-gray-500 uppercase">Replica Set</span>
                <p className="font-medium">{selectedInstance.replicaSetName}</p>
              </div>
            )}
          </div>

          {/* Advanced Configuration Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
            <h4 className="text-md font-medium mb-4">Instance Configuration</h4>
            
            {/* Config File Editor Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowConfigEditor(!showConfigEditor)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-dark-muted hover:text-primary-600"
              >
                <span className={`transform transition-transform ${showConfigEditor ? 'rotate-90' : ''}`}>▶</span>
                Configuration File ({selectedInstance.configPath})
              </button>
              {showConfigEditor && (
                <textarea
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                  className="w-full h-64 font-mono text-sm p-3 mt-2 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  spellCheck={false}
                  placeholder="Loading configuration..."
                />
              )}
            </div>

            {/* Quick Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data Directory
                    <span className="text-gray-500 text-xs ml-2">(Requires Restart)</span>
                  </label>
                  <input
                    type="text"
                    value={editConfig.dataDir}
                    onChange={(e) => setEditConfig({...editConfig, dataDir: e.target.value})}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port</label>
                  <input
                    type="text"
                    value={selectedInstance.port}
                    readOnly
                    className="input bg-gray-100 dark:bg-gray-800"
                    title="Port cannot be changed after instance creation"
                  />
                </div>
              </div>

              {/* Cluster Mode */}
              <div>
                <label className="block text-sm font-medium mb-1">Cluster Mode</label>
                <select
                  value={editConfig.clusterMode}
                  onChange={(e) => setEditConfig({...editConfig, clusterMode: e.target.value})}
                  className="input"
                >
                  <option value="standalone">Standalone (Default)</option>
                  <option value="replicaset">ReplicaSet</option>
                  <option value="sharding">Sharding (Cluster)</option>
                </select>
              </div>

              {/* ReplicaSet Options */}
              {editConfig.clusterMode === 'replicaset' && (
                <div className="ml-4 pl-4 border-l-4 border-primary-500 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Replica Set Name</label>
                      <input
                        type="text"
                        value={editConfig.replicaSetName}
                        onChange={(e) => setEditConfig({...editConfig, replicaSetName: e.target.value})}
                        placeholder="rs0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Node Role</label>
                      <select
                        value={editConfig.nodeRole}
                        onChange={(e) => setEditConfig({...editConfig, nodeRole: e.target.value})}
                        className="input"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="arbiter">Arbiter</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Keyfile Path</label>
                    <input
                      type="text"
                      value={editConfig.keyfilePath}
                      onChange={(e) => setEditConfig({...editConfig, keyfilePath: e.target.value})}
                      placeholder="/var/lib/mongodb/keyfile"
                      className="input"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.post('/api/mongodb/keyfile/generate', { path: editConfig.keyfilePath });
                            alert('Keyfile generated successfully!');
                          } catch (err) {
                            alert('Failed to generate keyfile: ' + (err.response?.data?.error || err.message));
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Generate Key
                      </button>
                      <label className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
                        Upload Key
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const formData = new FormData();
                                formData.append('keyfile', file);
                                formData.append('path', editConfig.keyfilePath);
                                await api.post('/api/mongodb/keyfile/upload', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                alert('Keyfile uploaded successfully!');
                              } catch (err) {
                                alert('Failed to upload keyfile: ' + (err.response?.data?.error || err.message));
                              }
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await api.get('/api/mongodb/keyfile/status', { params: { path: editConfig.keyfilePath } });
                            alert(`Keyfile Status:\n${JSON.stringify(res.data, null, 2)}`);
                          } catch (err) {
                            alert('Failed to check keyfile: ' + (err.response?.data?.error || err.message));
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Check Status
                      </button>
                    </div>
                  </div>

                  {/* PBM Backup Section */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <button
                      onClick={() => setShowPbmSettings(!showPbmSettings)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-dark-muted hover:text-primary-600"
                    >
                      <span className={`transform transition-transform ${showPbmSettings ? 'rotate-90' : ''}`}>▶</span>
                      <Database className="w-4 h-4" />
                      PBM Backup Configuration
                    </button>
                    
                    {showPbmSettings && (
                      <div className="mt-4 space-y-4">
                        {/* Enable PBM */}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editConfig.pbm?.enabled || false}
                            onChange={(e) => setEditConfig({
                              ...editConfig, 
                              pbm: {...editConfig.pbm, enabled: e.target.checked}
                            })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium">Enable PBM Backups</span>
                        </label>

                        {editConfig.pbm?.enabled && (
                          <div className="space-y-4 pl-4 border-l-2 border-blue-400">
                            {/* Backup Type */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Backup Type</label>
                              <select
                                value={editConfig.pbm?.type || 'logical'}
                                onChange={(e) => setEditConfig({
                                  ...editConfig, 
                                  pbm: {...editConfig.pbm, type: e.target.value}
                                })}
                                className="input"
                              >
                                <option value="logical">Logical (mongodump)</option>
                                <option value="physical">Physical (Hot Backup)</option>
                                <option value="pitr">PITR (Point-in-Time Recovery)</option>
                              </select>
                            </div>

                            {/* Storage Type */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Storage</label>
                              <select
                                value={editConfig.pbm?.storage || 'filesystem'}
                                onChange={(e) => setEditConfig({
                                  ...editConfig, 
                                  pbm: {...editConfig.pbm, storage: e.target.value}
                                })}
                                className="input"
                              >
                                <option value="filesystem">Local Filesystem</option>
                                <option value="s3">S3 Compatible</option>
                                {rcloneRemotes && rcloneRemotes.map(remote => (
                                  <option key={remote} value={`rclone:${remote}`}>Rclone: {remote}</option>
                                ))}
                              </select>
                            </div>

                            {/* Backup Path */}
                            {editConfig.pbm?.storage === 'filesystem' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Backup Path</label>
                                <input
                                  type="text"
                                  value={editConfig.pbm?.path || '/var/lib/pbm/backups'}
                                  onChange={(e) => setEditConfig({
                                    ...editConfig, 
                                    pbm: {...editConfig.pbm, path: e.target.value}
                                  })}
                                  className="input"
                                  placeholder="/var/lib/pbm/backups"
                                />
                              </div>
                            )}

                            {/* Rclone Path */}
                            {editConfig.pbm?.storage?.startsWith('rclone:') && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Remote Path</label>
                                <input
                                  type="text"
                                  value={editConfig.pbm?.rclonePath || '/backups'}
                                  onChange={(e) => setEditConfig({
                                    ...editConfig, 
                                    pbm: {...editConfig.pbm, rclonePath: e.target.value}
                                  })}
                                  className="input"
                                  placeholder="/backups"
                                />
                              </div>
                            )}

                            {/* Schedule */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Schedule</label>
                                  <select
                                    value={editConfig.pbm?.scheduleType || 'daily'}
                                    onChange={(e) => setEditConfig({
                                      ...editConfig, 
                                      pbm: {...editConfig.pbm, scheduleType: e.target.value}
                                    })}
                                    className="input"
                                  >
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Time</label>
                                  <input
                                    type="time"
                                    value={editConfig.pbm?.time || '02:00'}
                                    onChange={(e) => setEditConfig({
                                      ...editConfig, 
                                      pbm: {...editConfig.pbm, time: e.target.value}
                                    })}
                                    className="input"
                                  />
                                </div>
                              </div>
                              
                              {/* Weekday picker for Weekly */}
                              {editConfig.pbm?.scheduleType === 'weekly' && (
                                <div>
                                  <label className="block text-sm font-medium mb-1">Day of Week</label>
                                  <select
                                    value={editConfig.pbm?.weekday || '0'}
                                    onChange={(e) => setEditConfig({
                                      ...editConfig, 
                                      pbm: {...editConfig.pbm, weekday: e.target.value}
                                    })}
                                    className="input"
                                  >
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                  </select>
                                </div>
                              )}

                              {/* Day picker for Monthly */}
                              {editConfig.pbm?.scheduleType === 'monthly' && (
                                <div>
                                  <label className="block text-sm font-medium mb-1">Day of Month</label>
                                  <select
                                    value={editConfig.pbm?.dayOfMonth || '1'}
                                    onChange={(e) => setEditConfig({
                                      ...editConfig, 
                                      pbm: {...editConfig.pbm, dayOfMonth: e.target.value}
                                    })}
                                    className="input"
                                  >
                                    {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                      <option key={day} value={day}>{day}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            {/* S3 Settings */}
                            {editConfig.pbm?.storage === 's3' && (
                              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h5 className="text-sm font-medium">S3 Settings</h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Endpoint URL</label>
                                    <input
                                      type="text"
                                      value={editConfig.pbm?.s3Endpoint || ''}
                                      onChange={(e) => setEditConfig({
                                        ...editConfig, 
                                        pbm: {...editConfig.pbm, s3Endpoint: e.target.value}
                                      })}
                                      className="input"
                                      placeholder="https://s3.amazonaws.com"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Bucket</label>
                                    <input
                                      type="text"
                                      value={editConfig.pbm?.s3Bucket || ''}
                                      onChange={(e) => setEditConfig({
                                        ...editConfig, 
                                        pbm: {...editConfig.pbm, s3Bucket: e.target.value}
                                      })}
                                      className="input"
                                      placeholder="my-backup-bucket"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Access Key</label>
                                    <input
                                      type="text"
                                      value={editConfig.pbm?.s3Key || ''}
                                      onChange={(e) => setEditConfig({
                                        ...editConfig, 
                                        pbm: {...editConfig.pbm, s3Key: e.target.value}
                                      })}
                                      className="input"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Secret Key</label>
                                    <input
                                      type="password"
                                      value={editConfig.pbm?.s3Secret || ''}
                                      onChange={(e) => setEditConfig({
                                        ...editConfig, 
                                        pbm: {...editConfig.pbm, s3Secret: e.target.value}
                                      })}
                                      className="input"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Retention and Compression */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Retention (days)</label>
                                <input
                                  type="number"
                                  value={editConfig.pbm?.retention || 7}
                                  onChange={(e) => setEditConfig({
                                    ...editConfig, 
                                    pbm: {...editConfig.pbm, retention: parseInt(e.target.value)}
                                  })}
                                  className="input"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Compression</label>
                                <select
                                  value={editConfig.pbm?.compression || 'snappy'}
                                  onChange={(e) => setEditConfig({
                                    ...editConfig, 
                                    pbm: {...editConfig.pbm, compression: e.target.value}
                                  })}
                                  className="input"
                                >
                                  <option value="none">None</option>
                                  <option value="snappy">Snappy (Fast)</option>
                                  <option value="zstd">Zstd (Best)</option>
                                  <option value="gzip">Gzip</option>
                                </select>
                              </div>
                            </div>

                            {/* PITR Settings - shown when backup type is PITR */}
                            {editConfig.pbm?.type === 'pitr' && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h5 className="text-sm font-medium mb-4 text-green-600">PITR Settings</h5>
                                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-green-400">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Oplog Capture Interval (minutes)</label>
                                    <input
                                      type="number"
                                      value={editConfig.pbm?.pitrInterval || 10}
                                      onChange={(e) => setEditConfig({
                                        ...editConfig, 
                                        pbm: {...editConfig.pbm, pitrInterval: parseInt(e.target.value)}
                                      })}
                                      className="input"
                                      min="1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">How often to capture oplog slices</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">PITR Retention (days)</label>
                                    <input
                                      type="number"
                                      value={editConfig.pbm?.pitrRetention || 3}
                                      onChange={(e) => setEditConfig({
                                        ...editConfig, 
                                        pbm: {...editConfig.pbm, pitrRetention: parseInt(e.target.value)}
                                      })}
                                      className="input"
                                      min="1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Days to retain PITR oplog data</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sharding Options */}
              {editConfig.clusterMode === 'sharding' && (
                <div className="ml-4 pl-4 border-l-4 border-amber-500 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cluster Role</label>
                    <select
                      value={editConfig.shardRole}
                      onChange={(e) => setEditConfig({...editConfig, shardRole: e.target.value})}
                      className="input"
                    >
                      <option value="shardsvr">Shard Server (Data)</option>
                      <option value="configsvr">Config Server (Metadata)</option>
                      <option value="mongos">Mongos Router</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Keyfile Path</label>
                    <input
                      type="text"
                      value={editConfig.keyfilePath}
                      onChange={(e) => setEditConfig({...editConfig, keyfilePath: e.target.value})}
                      placeholder="/var/lib/mongodb/keyfile"
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Section */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={restartAfterSave}
                  onChange={(e) => setRestartAfterSave(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">Restart service after saving</span>
              </label>
              <button
                onClick={() => saveConfigMutation.mutate({ configText, settings: editConfig })}
                disabled={saveConfigMutation.isPending}
                className="btn btn-primary"
              >
                {saveConfigMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Configuration</>
                )}
              </button>
            </div>

            {/* Save Status */}
            {saveConfigMutation.isSuccess && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Configuration saved successfully
              </div>
            )}
            {saveConfigMutation.isError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <XCircle className="w-4 h-4 inline mr-2" />
                {saveConfigMutation.error?.response?.data?.error || 'Failed to save configuration'}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MongoDBSettings({ rcloneRemotes }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState('');
  const [clusterMode, setClusterMode] = useState('standalone');
  const [replicaSetName, setReplicaSetName] = useState('rs0');
  const [nodeRole, setNodeRole] = useState('primary');
  const [shardRole, setShardRole] = useState('shardsvr');
  const [keyfilePath, setKeyfilePath] = useState('/var/lib/mongodb/keyfile');
  const [dataDir, setDataDir] = useState('/var/lib/mongodb');
  const [restartAfterSave, setRestartAfterSave] = useState(true);
  const [keyfileStatus, setKeyfileStatus] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  // PBM Settings
  const [pbmEnabled, setPbmEnabled] = useState(false);
  const [pbmType, setPbmType] = useState('logical');
  const [pbmScheduleType, setPbmScheduleType] = useState('daily');
  const [pbmTime, setPbmTime] = useState('02:00');
  const [pbmWeekday, setPbmWeekday] = useState('0');
  const [pbmInterval, setPbmInterval] = useState('6');
  const [pbmCron, setPbmCron] = useState('0 2 * * *');
  const [pbmRetention, setPbmRetention] = useState(7);
  const [pbmStorage, setPbmStorage] = useState('filesystem');
  const [pbmPath, setPbmPath] = useState('/var/lib/pbm/backups');
  const [pbmS3Endpoint, setPbmS3Endpoint] = useState('');
  const [pbmS3Bucket, setPbmS3Bucket] = useState('');
  const [pbmS3Key, setPbmS3Key] = useState('');
  const [pbmS3Secret, setPbmS3Secret] = useState('');
  const [pbmCompression, setPbmCompression] = useState(true);
  const [pbmPitr, setPbmPitr] = useState(false);
  const [pitrInterval, setPitrInterval] = useState(10);
  const [pitrRetention, setPitrRetention] = useState(3);
  const [pbmUsername, setPbmUsername] = useState('');
  const [pbmPassword, setPbmPassword] = useState('');

  // Fetch MongoDB config
  const { data: mongoConfig, isLoading } = useQuery({
    queryKey: ['mongodb-config'],
    queryFn: async () => {
      const res = await api.get('/api/mongodb/config');
      return res.data;
    }
  });

  // Fetch PBM status
  const { data: pbmStatus } = useQuery({
    queryKey: ['pbm-status'],
    queryFn: async () => {
      const res = await api.get('/api/mongodb/pbm/status');
      return res.data;
    }
  });

  // Initialize form with fetched data
  useEffect(() => {
    if (mongoConfig) {
      setConfig(mongoConfig.config || '');
      if (mongoConfig.settings) {
        setClusterMode(mongoConfig.settings.clusterMode || 'standalone');
        setReplicaSetName(mongoConfig.settings.replicaSetName || 'rs0');
        setNodeRole(mongoConfig.settings.nodeRole || 'primary');
        setShardRole(mongoConfig.settings.shardRole || 'shardsvr');
        setKeyfilePath(mongoConfig.settings.keyfilePath || '/var/lib/mongodb/keyfile');
        setDataDir(mongoConfig.settings.dataDir || '/var/lib/mongodb');
        
        // Load PBM settings
        if (mongoConfig.settings.pbm) {
          const pbm = mongoConfig.settings.pbm;
          setPbmEnabled(pbm.enabled || false);
          setPbmType(pbm.type || 'logical');
          setPbmScheduleType(pbm.scheduleType || 'daily');
          setPbmTime(pbm.time || '02:00');
          setPbmWeekday(pbm.weekday || '0');
          setPbmInterval(pbm.interval || '6');
          setPbmCron(pbm.cron || '0 2 * * *');
          setPbmRetention(pbm.retention || 7);
          setPbmStorage(pbm.storage || 'filesystem');
          setPbmPath(pbm.path || '/var/lib/pbm/backups');
          setPbmS3Endpoint(pbm.s3Endpoint || '');
          setPbmS3Bucket(pbm.s3Bucket || '');
          setPbmS3Key(pbm.s3Key || '');
          setPbmS3Secret(pbm.s3Secret || '');
          setPbmCompression(pbm.compression !== false);
          setPbmPitr(pbm.pitr || false);
          setPitrInterval(pbm.pitrInterval || 10);
          setPitrRetention(pbm.pitrRetention || 3);
        }
      }
    }
  }, [mongoConfig]);

  // Check keyfile status
  const checkKeyfileStatus = async () => {
    try {
      const res = await api.get('/api/mongodb/keyfile/status', { params: { path: keyfilePath } });
      setKeyfileStatus(res.data);
    } catch {
      setKeyfileStatus({ exists: false, valid: false });
    }
  };

  useEffect(() => {
    if (clusterMode !== 'standalone') {
      checkKeyfileStatus();
    }
  }, [clusterMode, keyfilePath]);

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/api/mongodb/config', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mongodb-config']);
    }
  });

  // Generate keyfile mutation
  const generateKeyfileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/mongodb/keyfile/generate', { path: keyfilePath });
      return res.data;
    },
    onSuccess: () => {
      checkKeyfileStatus();
    }
  });

  // Handle config save
  const handleSave = () => {
    saveMutation.mutate({ 
      config, 
      restart: restartAfterSave,
      clusterMode,
      replicaSetName,
      nodeRole,
      shardRole,
      keyfilePath,
      dataDir,
      pbm: {
        enabled: pbmEnabled,
        type: pbmType,
        scheduleType: pbmScheduleType,
        time: pbmTime,
        weekday: pbmWeekday,
        interval: pbmInterval,
        cron: pbmCron,
        retention: pbmRetention,
        storage: pbmStorage,
        path: pbmPath,
        s3Endpoint: pbmS3Endpoint,
        s3Bucket: pbmS3Bucket,
        s3Key: pbmS3Key,
        s3Secret: pbmS3Secret,
        compression: pbmCompression,
        pitr: pbmPitr,
        username: pbmUsername,
        password: pbmPassword,
        pitrInterval,
        pitrRetention
      }
    });
  };

  // Handle keyfile download
  const handleDownloadKeyfile = () => {
    window.open(`/api/mongodb/keyfile/download?path=${encodeURIComponent(keyfilePath)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MongoDB Instances Section - handles all instance management and config */}
      <MongoDBInstanceManager rcloneRemotes={rcloneRemotes} />
    </div>
  );
}

// Keyfile Section Component
function KeyfileSection({
  keyfilePath,
  setKeyfilePath,
  keyfileStatus,
  onGenerate,
  onDownload,
  isGenerating,
  generateError,
  generateSuccess
}) {
  const [uploadContent, setUploadContent] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/mongodb/keyfile/upload', { path: keyfilePath, content: uploadContent });
    }
  });

  return (
    <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-500" />
        <h4 className="font-medium">Keyfile Authentication</h4>
      </div>
      <p className="text-sm text-gray-600 dark:text-dark-muted">
        Keyfile is required for authentication between cluster members.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">Keyfile Path</label>
        <input
          type="text"
          value={keyfilePath}
          onChange={(e) => setKeyfilePath(e.target.value)}
          className="input"
        />
      </div>

      {/* Keyfile Status */}
      {keyfileStatus && (
        <div className={`text-sm flex items-center gap-2 ${keyfileStatus.valid ? 'text-green-600' : 'text-amber-600'}`}>
          {keyfileStatus.valid ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Keyfile exists and has correct permissions ({keyfileStatus.permissions})
            </>
          ) : keyfileStatus.exists ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              Keyfile exists but has incorrect permissions ({keyfileStatus.permissions}). Should be 400 or 600.
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Keyfile does not exist at this path
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn btn-secondary"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Key className="w-4 h-4 mr-2" />
          )}
          Generate Key
        </button>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="btn btn-secondary"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Key
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!keyfileStatus?.exists}
          className="btn btn-secondary"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Key
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="space-y-2 p-3 bg-white dark:bg-dark-card rounded border border-gray-200 dark:border-dark-border">
          <label className="block text-sm font-medium">Paste keyfile content:</label>
          <textarea
            value={uploadContent}
            onChange={(e) => setUploadContent(e.target.value)}
            className="input font-mono text-xs h-24"
            placeholder="Paste base64-encoded keyfile content here..."
          />
          <button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={!uploadContent || uploadMutation.isPending}
            className="btn btn-primary btn-sm"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {generateSuccess && (
        <div className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Keyfile generated successfully
        </div>
      )}
      {generateError && (
        <div className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          {generateError?.response?.data?.error || 'Failed to generate keyfile'}
        </div>
      )}
    </div>
  );
}

// PBM Section Component
function PBMSection({
  pbmStatus,
  pbmEnabled,
  setPbmEnabled,
  pbmType,
  setPbmType,
  pbmScheduleType,
  setPbmScheduleType,
  pbmTime,
  setPbmTime,
  pbmWeekday,
  setPbmWeekday,
  pbmInterval,
  setPbmInterval,
  pbmCron,
  setPbmCron,
  pbmRetention,
  setPbmRetention,
  pbmStorage,
  setPbmStorage,
  pbmPath,
  setPbmPath,
  pbmS3Endpoint,
  setPbmS3Endpoint,
  pbmS3Bucket,
  setPbmS3Bucket,
  pbmS3Key,
  setPbmS3Key,
  pbmS3Secret,
  setPbmS3Secret,
  pbmCompression,
  setPbmCompression,
  pbmPitr,
  setPbmPitr,
  pitrInterval,
  setPitrInterval,
  pitrRetention,
  setPitrRetention,
  pbmUsername,
  setPbmUsername,
  pbmPassword,
  setPbmPassword,
  rcloneRemotes
}) {
  const backupTypeNotes = {
    logical: 'Slower but compatible across MongoDB versions. Good for migration.',
    physical: 'Faster backup/restore. Requires same MongoDB version for restore.',
    incremental: 'Continuous oplog capture for point-in-time recovery to any second.'
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pbmEnabled}
            onChange={(e) => setPbmEnabled(e.target.checked)}
            disabled={pbmStatus?.installed === false}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="font-medium">Enable Percona Backup (PBM)</span>
          {pbmStatus?.installed === false && (
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Not Installed</span>
          )}
        </label>
        {pbmStatus?.installed === false && (
          <Link
            to="/applications"
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Install PBM
          </Link>
        )}
      </div>

      {pbmEnabled && (
        <div className="p-4 bg-gray-50 dark:bg-dark-border rounded-lg space-y-4">
          {/* Backup Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Backup Type</label>
            <select
              value={pbmType}
              onChange={(e) => setPbmType(e.target.value)}
              className="input"
            >
              <option value="logical">Logical (mongodump)</option>
              <option value="physical">Physical (file copy)</option>
              <option value="incremental">Incremental + PITR</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{backupTypeNotes[pbmType]}</p>
          </div>

          {/* Schedule - for logical/physical */}
          {pbmType !== 'incremental' && (
            <div>
              <label className="block text-sm font-medium mb-1">Backup Schedule</label>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={pbmScheduleType}
                  onChange={(e) => setPbmScheduleType(e.target.value)}
                  className="input w-auto"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="interval">Every X hours</option>
                  <option value="custom">Custom cron</option>
                </select>

                {(pbmScheduleType === 'daily' || pbmScheduleType === 'weekly' || pbmScheduleType === 'monthly') && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">at</span>
                    <input
                      type="time"
                      value={pbmTime}
                      onChange={(e) => setPbmTime(e.target.value)}
                      className="input w-auto"
                    />
                  </div>
                )}

                {pbmScheduleType === 'weekly' && (
                  <select
                    value={pbmWeekday}
                    onChange={(e) => setPbmWeekday(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                )}

                 {pbmScheduleType === 'monthly' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">on day</span>
                    <select
                      value={pbmWeekday} // Reusing pbmWeekday for day of month (1-31)
                      onChange={(e) => setPbmWeekday(e.target.value)}
                      className="input w-auto"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {pbmScheduleType === 'interval' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">every</span>
                    <select
                      value={pbmInterval}
                      onChange={(e) => setPbmInterval(e.target.value)}
                      className="input w-auto"
                    >
                      {[1, 2, 3, 4, 6, 8, 12].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-sm">hours</span>
                  </div>
                )}
              </div>

              {pbmScheduleType === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={pbmCron}
                    onChange={(e) => setPbmCron(e.target.value)}
                    placeholder="0 2 * * *"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: minute hour day month weekday</p>
                </div>
              )}
            </div>
          )}

          {/* Incremental Settings */}
          {pbmType === 'incremental' && (
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Incremental mode automatically enables Point-in-Time Recovery (PITR).
                  You can restore to any second between backups.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Base (Full) Backup Schedule</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <select 
                    value={pbmScheduleType} // Fixed binding
                    onChange={(e) => setPbmScheduleType(e.target.value)} // Fixed handler
                    className="input w-auto"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <span className="text-sm">at</span>
                  <input 
                    type="time" 
                    value={pbmTime} // Fixed binding
                    onChange={(e) => setPbmTime(e.target.value)} // Fixed handler
                    className="input w-auto" 
                  />

                  {pbmScheduleType === 'weekly' && (
                    <select
                      value={pbmWeekday}
                      onChange={(e) => setPbmWeekday(e.target.value)}
                      className="input w-auto"
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  )}

                  {pbmScheduleType === 'monthly' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">on day</span>
                      <select
                        value={pbmWeekday} // Reuse weekday for day of month (1-31)
                        onChange={(e) => setPbmWeekday(e.target.value)}
                        className="input w-auto"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PITR Oplog Slice Interval</label>
                <select
                  value={pitrInterval}
                  onChange={(e) => setPitrInterval(Number(e.target.value))}
                  className="input w-auto"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes (recommended)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How often to save oplog slices. Smaller = more granular recovery but more storage.
                </p>
              </div>
            </div>
          )}

          {/* PBM Credentials (Optional) */}
          <div className="pt-2 border-t border-gray-200 dark:border-dark-border mb-4">
             <h4 className="font-medium text-sm mb-3">PBM Authentication</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">PBM Username</label>
                  <input
                    type="text"
                    value={pbmUsername}
                    onChange={(e) => setPbmUsername(e.target.value)}
                    className="input"
                    placeholder="Leave empty to use authentication keyfile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">PBM Password</label>
                  <input
                    type="password"
                    value={pbmPassword}
                    onChange={(e) => setPbmPassword(e.target.value)}
                    className="input"
                    placeholder="Leave empty if not set"
                  />
                </div>
             </div>
          </div>

          {/* Retention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Backup Retention (days)</label>
              <input
                type="number"
                value={pbmRetention}
                onChange={(e) => setPbmRetention(Number(e.target.value))}
                min={1}
                max={365}
                className="input"
              />
            </div>
            {(pbmType === 'incremental' || pbmPitr) && (
              <div>
                <label className="block text-sm font-medium mb-1">PITR Oplog Retention (days)</label>
                <input
                  type="number"
                  value={pitrRetention}
                  onChange={(e) => setPitrRetention(Number(e.target.value))}
                  min={1}
                  max={30}
                  className="input"
                />
              </div>
            )}
          </div>

          {/* Storage */}
          <div>
            <label className="block text-sm font-medium mb-1">Storage</label>
            <select
              value={pbmStorage} // This can now be 'filesystem', 's3', or 'rclone:<remote>'
              onChange={(e) => {
                const val = e.target.value;
                setPbmStorage(val);
                // Auto-set path for rclone
                if (val.startsWith('rclone:')) {
                  const remoteName = val.split(':')[1];
                  setPbmPath(`/mnt/rclone/${remoteName}`);
                }
              }}
              className="input"
            >
              <option value="filesystem">Local Filesystem</option>
              <option value="s3">Amazon S3 / Compatible</option>
              <optgroup label="Rclone Remotes">
                {rcloneRemotes?.map(remote => (
                  <option key={remote.Name} value={`rclone:${remote.Name}`}>
                    Rclone: {remote.Name} ({remote.Type})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {(pbmStorage === 'filesystem' || pbmStorage.startsWith('rclone:')) && (
            <div>
              <label className="block text-sm font-medium mb-1">Backup Path</label>
              <input
                type="text"
                value={pbmPath}
                onChange={(e) => setPbmPath(e.target.value)}
                className="input"
                // Lock the path if it's an Rclone mount to prevent confusion, or let user edit?
                // Let's leave it editable but suggest the default.
              />
              {pbmStorage.startsWith('rclone:') && (
                <p className="text-xs text-amber-600 mt-1">
                  Ensure the Rclone remote is mounted at this path. System will attempt to mount it on save.
                </p>
              )}
            </div>
          )}

          {pbmStorage === 's3' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">S3 Endpoint</label>
                <input
                  type="text"
                  value={pbmS3Endpoint}
                  onChange={(e) => setPbmS3Endpoint(e.target.value)}
                  placeholder="s3.amazonaws.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">S3 Bucket</label>
                <input
                  type="text"
                  value={pbmS3Bucket}
                  onChange={(e) => setPbmS3Bucket(e.target.value)}
                  placeholder="my-mongodb-backups"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Access Key</label>
                  <input
                    type="text"
                    value={pbmS3Key}
                    onChange={(e) => setPbmS3Key(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Secret Key</label>
                  <input
                    type="password"
                    value={pbmS3Secret}
                    onChange={(e) => setPbmS3Secret(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PITR for Physical backup */}
          {pbmType === 'physical' && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pbmPitr}
                  onChange={(e) => setPbmPitr(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>Enable PITR (Point-in-Time Recovery)</span>
              </label>
              {pbmPitr && (
                <div className="mt-2 ml-6">
                  <label className="block text-sm font-medium mb-1">Oplog Slice Interval</label>
                  <select
                    value={pitrInterval}
                    onChange={(e) => setPitrInterval(Number(e.target.value))}
                    className="input w-auto"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes (recommended)</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Compression */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pbmCompression}
              onChange={(e) => setPbmCompression(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Enable Compression</span>
          </label>

          {/* Tip */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Tip:</strong> In a ReplicaSet, PBM automatically runs backup on a Secondary node
              to avoid impacting Primary performance. You only need to configure backup on one node -
              PBM coordinates across the cluster.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

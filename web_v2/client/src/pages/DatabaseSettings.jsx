import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import {
  Database, Settings, Server, Save, Key, Upload, Download,
  CheckCircle, XCircle, AlertTriangle, Loader2, Leaf, Info, ExternalLink
} from 'lucide-react';

export default function DatabaseSettings() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'mysql');

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
          {activeTab === 'mongodb' && <MongoDBSettings />}
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

function MongoDBSettings() {
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
    saveMutation.mutate({ config, restart: restartAfterSave });
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
      {/* Status Bar */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-dark-muted">Status:</span>
          {mongoConfig?.status === 'running' ? (
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
          <span className="text-sm">{mongoConfig?.version || 'Unknown'}</span>
        </div>
      </div>

      {/* Config Editor */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Configuration File ({mongoConfig?.configPath || '/etc/mongod.conf'})
        </label>
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full h-64 font-mono text-sm p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          spellCheck={false}
        />
      </div>

      {/* Advanced Configuration */}
      <div className="border-t border-gray-200 dark:border-dark-border pt-6">
        <h3 className="text-lg font-medium mb-4">Advanced Configuration</h3>

        {/* Data Directory */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Data Directory
            <span className="text-gray-500 text-xs ml-2">(Requires Service Restart)</span>
          </label>
          <input
            type="text"
            value={dataDir}
            onChange={(e) => setDataDir(e.target.value)}
            className="input"
          />
        </div>

        {/* Cluster Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Cluster Mode</label>
          <select
            value={clusterMode}
            onChange={(e) => setClusterMode(e.target.value)}
            className="input"
          >
            <option value="standalone">Standalone (Default)</option>
            <option value="replicaset">ReplicaSet</option>
            <option value="sharding">Sharding (Cluster)</option>
          </select>
        </div>

        {/* ReplicaSet Options */}
        {clusterMode === 'replicaset' && (
          <div className="ml-4 pl-4 border-l-4 border-primary-500 space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Replica Set Name</label>
              <input
                type="text"
                value={replicaSetName}
                onChange={(e) => setReplicaSetName(e.target.value)}
                placeholder="rs0"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Node Role</label>
              <select
                value={nodeRole}
                onChange={(e) => setNodeRole(e.target.value)}
                className="input"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="arbiter">Arbiter</option>
              </select>
            </div>

            {/* Keyfile Authentication */}
            <KeyfileSection
              keyfilePath={keyfilePath}
              setKeyfilePath={setKeyfilePath}
              keyfileStatus={keyfileStatus}
              onGenerate={() => generateKeyfileMutation.mutate()}
              onDownload={handleDownloadKeyfile}
              isGenerating={generateKeyfileMutation.isPending}
              generateError={generateKeyfileMutation.error}
              generateSuccess={generateKeyfileMutation.isSuccess}
            />

            {/* PBM Backup Section */}
            <PBMSection
              pbmStatus={pbmStatus}
              pbmEnabled={pbmEnabled}
              setPbmEnabled={setPbmEnabled}
              pbmType={pbmType}
              setPbmType={setPbmType}
              pbmScheduleType={pbmScheduleType}
              setPbmScheduleType={setPbmScheduleType}
              pbmTime={pbmTime}
              setPbmTime={setPbmTime}
              pbmWeekday={pbmWeekday}
              setPbmWeekday={setPbmWeekday}
              pbmInterval={pbmInterval}
              setPbmInterval={setPbmInterval}
              pbmCron={pbmCron}
              setPbmCron={setPbmCron}
              pbmRetention={pbmRetention}
              setPbmRetention={setPbmRetention}
              pbmStorage={pbmStorage}
              setPbmStorage={setPbmStorage}
              pbmPath={pbmPath}
              setPbmPath={setPbmPath}
              pbmS3Endpoint={pbmS3Endpoint}
              setPbmS3Endpoint={setPbmS3Endpoint}
              pbmS3Bucket={pbmS3Bucket}
              setPbmS3Bucket={setPbmS3Bucket}
              pbmS3Key={pbmS3Key}
              setPbmS3Key={setPbmS3Key}
              pbmS3Secret={pbmS3Secret}
              setPbmS3Secret={setPbmS3Secret}
              pbmCompression={pbmCompression}
              setPbmCompression={setPbmCompression}
              pbmPitr={pbmPitr}
              setPbmPitr={setPbmPitr}
              pitrInterval={pitrInterval}
              setPitrInterval={setPitrInterval}
              pitrRetention={pitrRetention}
              setPitrRetention={setPitrRetention}
            />
          </div>
        )}

        {/* Sharding Options */}
        {clusterMode === 'sharding' && (
          <div className="ml-4 pl-4 border-l-4 border-amber-500 space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cluster Role</label>
              <select
                value={shardRole}
                onChange={(e) => setShardRole(e.target.value)}
                className="input"
              >
                <option value="shardsvr">Shard Server (Data)</option>
                <option value="configsvr">Config Server (Metadata)</option>
                <option value="mongos">Mongos Router</option>
              </select>
            </div>

            {/* Keyfile Authentication */}
            <KeyfileSection
              keyfilePath={keyfilePath}
              setKeyfilePath={setKeyfilePath}
              keyfileStatus={keyfileStatus}
              onGenerate={() => generateKeyfileMutation.mutate()}
              onDownload={handleDownloadKeyfile}
              isGenerating={generateKeyfileMutation.isPending}
              generateError={generateKeyfileMutation.error}
              generateSuccess={generateKeyfileMutation.isSuccess}
            />
          </div>
        )}
      </div>

      {/* Save Options */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
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
          onClick={handleSave}
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

      {/* Save Status */}
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
  setPitrRetention
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
                  <option value="interval">Every X hours</option>
                  <option value="custom">Custom cron</option>
                </select>

                {(pbmScheduleType === 'daily' || pbmScheduleType === 'weekly') && (
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
                  <select className="input w-auto">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                  </select>
                  <span className="text-sm">at</span>
                  <input type="time" defaultValue="02:00" className="input w-auto" />
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
              value={pbmStorage}
              onChange={(e) => setPbmStorage(e.target.value)}
              className="input"
            >
              <option value="filesystem">Local Filesystem</option>
              <option value="s3">Amazon S3 / Compatible</option>
            </select>
          </div>

          {pbmStorage === 'filesystem' && (
            <div>
              <label className="block text-sm font-medium mb-1">Backup Path</label>
              <input
                type="text"
                value={pbmPath}
                onChange={(e) => setPbmPath(e.target.value)}
                className="input"
              />
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

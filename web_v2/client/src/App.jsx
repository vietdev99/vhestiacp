import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserAdd from './pages/UserAdd';
import UserEdit from './pages/UserEdit';
import UserSSHKeys from './pages/UserSSHKeys';
import UserLogs from './pages/UserLogs';
import Web from './pages/Web';
import WebAdd from './pages/WebAdd';
import WebEdit from './pages/WebEdit';
import WebLogs from './pages/WebLogs';
import DNS from './pages/DNS';
import DNSAdd from './pages/DNSAdd';
import DNSRecords from './pages/DNSRecords';
import DNSRecordAdd from './pages/DNSRecordAdd';
import DNSEdit from './pages/DNSEdit';
import Mail from './pages/Mail';
import MailAdd from './pages/MailAdd';
import Databases from './pages/Databases';
import DatabaseAdd from './pages/DatabaseAdd';
import MongoDBAdd from './pages/MongoDBAdd';
import DatabaseSettings from './pages/DatabaseSettings';
import Cron from './pages/Cron';
import CronAdd from './pages/CronAdd';
import CronEdit from './pages/CronEdit';
import Backups from './pages/Backups';
import Packages from './pages/Packages';
import PackageAdd from './pages/PackageAdd';
import PackageEdit from './pages/PackageEdit';
import QuickInstall from './pages/QuickInstall';
import Applications from './pages/Applications';
import FileManager from './pages/FileManager';
import ServerServices from './pages/ServerServices';
import ServiceEdit from './pages/ServiceEdit';
import Firewall from './pages/Firewall';
import FirewallAdd from './pages/FirewallAdd';
import FirewallEdit from './pages/FirewallEdit';
import FirewallBanlist from './pages/FirewallBanlist';
import HAProxy from './pages/HAProxy';
import HAProxyVisualize from './pages/HAProxyVisualize';
import HAProxyConfig from './pages/HAProxyConfig';
import HAProxyFrontendAdd from './pages/HAProxyFrontendAdd';
import HAProxyBackendAdd from './pages/HAProxyBackendAdd';
import RcloneSettings from './pages/RcloneSettings';
import Stats from './pages/Stats';
import Statistics from './pages/Statistics';
import ServerInfo from './pages/ServerInfo';
import PM2 from './pages/PM2';
import Security from './pages/Security';
import ServerConfigure from './pages/ServerConfigure';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
        <Route path="users/add" element={<ProtectedRoute adminOnly><UserAdd /></ProtectedRoute>} />
        <Route path="users/:username/edit" element={<UserEdit />} />
        <Route path="users/:username/ssh-keys" element={<UserSSHKeys />} />
        <Route path="users/:username/logs" element={<UserLogs />} />
        <Route path="web" element={<Web />} />
        <Route path="web/add" element={<WebAdd />} />
        <Route path="web/:domain/edit" element={<WebEdit />} />
        <Route path="web/:domain/logs" element={<WebLogs />} />
        <Route path="web/:domain/quick-install" element={<QuickInstall />} />
        <Route path="dns" element={<DNS />} />
        <Route path="dns/add" element={<DNSAdd />} />
        <Route path="dns/:domain" element={<DNSRecords />} />
        <Route path="dns/:domain/edit" element={<DNSEdit />} />
        <Route path="dns/:domain/add-record" element={<DNSRecordAdd />} />
        <Route path="mail" element={<Mail />} />
        <Route path="mail/add" element={<MailAdd />} />
        <Route path="databases" element={<Databases />} />
        <Route path="databases/add" element={<DatabaseAdd />} />
        <Route path="databases/mongodb/add" element={<MongoDBAdd />} />
        <Route path="admin/database-settings" element={<ProtectedRoute adminOnly><DatabaseSettings /></ProtectedRoute>} />
        <Route path="cron" element={<Cron />} />
        <Route path="cron/add" element={<CronAdd />} />
        <Route path="cron/:id/edit" element={<CronEdit />} />
        <Route path="backups" element={<Backups />} />
        <Route path="packages" element={<ProtectedRoute adminOnly><Packages /></ProtectedRoute>} />
        <Route path="packages/add" element={<ProtectedRoute adminOnly><PackageAdd /></ProtectedRoute>} />
        <Route path="packages/:name/edit" element={<ProtectedRoute adminOnly><PackageEdit /></ProtectedRoute>} />
        <Route path="server-services" element={<ProtectedRoute adminOnly><ServerServices /></ProtectedRoute>} />
        <Route path="server-services/:name/edit" element={<ProtectedRoute adminOnly><ServiceEdit /></ProtectedRoute>} />
        <Route path="applications" element={<ProtectedRoute adminOnly><Applications /></ProtectedRoute>} />
        <Route path="file-manager" element={<ProtectedRoute adminOnly><FileManager /></ProtectedRoute>} />
        <Route path="firewall" element={<ProtectedRoute adminOnly><Firewall /></ProtectedRoute>} />
        <Route path="firewall/add" element={<ProtectedRoute adminOnly><FirewallAdd /></ProtectedRoute>} />
        <Route path="firewall/:id/edit" element={<ProtectedRoute adminOnly><FirewallEdit /></ProtectedRoute>} />
        <Route path="firewall/banlist" element={<ProtectedRoute adminOnly><FirewallBanlist /></ProtectedRoute>} />
        <Route path="haproxy" element={<ProtectedRoute adminOnly><HAProxy /></ProtectedRoute>} />
        <Route path="haproxy/visualize" element={<ProtectedRoute adminOnly><HAProxyVisualize /></ProtectedRoute>} />
        <Route path="haproxy/config" element={<ProtectedRoute adminOnly><HAProxyConfig /></ProtectedRoute>} />
        <Route path="haproxy/frontend/add" element={<ProtectedRoute adminOnly><HAProxyFrontendAdd /></ProtectedRoute>} />
        <Route path="haproxy/backend/add" element={<ProtectedRoute adminOnly><HAProxyBackendAdd /></ProtectedRoute>} />
        <Route path="admin/rclone" element={<ProtectedRoute adminOnly><RcloneSettings /></ProtectedRoute>} />
        <Route path="stats" element={<Stats />} />
        <Route path="statistics" element={<ProtectedRoute adminOnly><Statistics /></ProtectedRoute>} />
        <Route path="server-info" element={<ProtectedRoute adminOnly><ServerInfo /></ProtectedRoute>} />
        <Route path="server/configure" element={<ProtectedRoute adminOnly><ServerConfigure /></ProtectedRoute>} />
        <Route path="pm2" element={<PM2 />} />
        <Route path="security" element={<Security />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  Folder,
  ChevronRight,
  Home,
  ArrowUp,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Plus,
  Edit,
  Eye,
  Copy,
  Scissors,
  Clipboard,
  MoreVertical,
  Search,
  Grid,
  List,
  Loader2,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FileManager() {
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState('~'); // Start at home directory
  const [homePath, setHomePath] = useState(null); // Store actual home path
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [clipboard, setClipboard] = useState(null); // { action: 'copy' | 'cut', files: [] }
  const fileInputRef = useRef(null);

  // Fetch directory contents
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['file-manager', currentPath],
    queryFn: async () => {
      const res = await api.get('/api/files/list', { params: { path: currentPath } });
      // Store actual home path when we get it
      if (res.data?.homePath && !homePath) {
        setHomePath(res.data.homePath);
      }
      return res.data;
    }
  });

  // Clear selection when path changes
  useEffect(() => {
    setSelectedFiles([]);
  }, [currentPath]);

  // Navigate to path
  const navigateTo = (path) => {
    setCurrentPath(path);
  };

  // Go up one directory
  const goUp = () => {
    // If at home path or ~, don't go up further for regular users
    const effectivePath = currentPath === '~' ? (homePath || '/home') : currentPath;
    if (effectivePath === '/' || effectivePath === homePath) return;

    const parts = effectivePath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');

    // If going above home, stay at home
    if (homePath && !newPath.startsWith(homePath) && newPath !== homePath) {
      setCurrentPath('~');
    } else {
      setCurrentPath(newPath || '/');
    }
  };

  // Go to home directory
  const goHome = () => {
    setCurrentPath('~');
  };

  // Build breadcrumb path parts
  const pathParts = currentPath.split('/').filter(Boolean);

  // Toggle file selection
  const toggleSelect = (file, event) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedFiles(prev =>
        prev.includes(file.name)
          ? prev.filter(f => f !== file.name)
          : [...prev, file.name]
      );
    } else if (event.shiftKey && selectedFiles.length > 0) {
      // Range selection
      const files = data?.files || [];
      const lastSelected = files.findIndex(f => f.name === selectedFiles[selectedFiles.length - 1]);
      const current = files.findIndex(f => f.name === file.name);
      const start = Math.min(lastSelected, current);
      const end = Math.max(lastSelected, current);
      const range = files.slice(start, end + 1).map(f => f.name);
      setSelectedFiles([...new Set([...selectedFiles, ...range])]);
    } else {
      setSelectedFiles([file.name]);
    }
  };

  // Double click to open folder or view file
  const handleDoubleClick = (file) => {
    if (file.isDirectory) {
      navigateTo(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`);
    } else {
      // Open file viewer/editor
      setShowEditModal(file);
    }
  };

  // Get file icon based on extension
  const getFileIcon = (file) => {
    if (file.isDirectory) return <Folder className="w-5 h-5 text-amber-500" />;

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return <FileImage className="w-5 h-5 text-purple-500" />;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
      case '7z':
        return <FileArchive className="w-5 h-5 text-orange-500" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'php':
      case 'rb':
      case 'go':
      case 'java':
      case 'c':
      case 'cpp':
      case 'h':
      case 'css':
      case 'scss':
      case 'html':
      case 'xml':
      case 'json':
      case 'yaml':
      case 'yml':
      case 'sh':
      case 'bash':
        return <FileCode className="w-5 h-5 text-green-500" />;
      case 'txt':
      case 'md':
      case 'log':
      case 'conf':
      case 'cfg':
      case 'ini':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name) => {
      await api.post('/api/files/mkdir', { path: currentPath, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['file-manager', currentPath]);
      setShowNewFolderModal(false);
      toast.success('Folder created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create folder');
    }
  });

  // Create file mutation
  const createFileMutation = useMutation({
    mutationFn: async ({ name, content }) => {
      await api.post('/api/files/create', { path: currentPath, name, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['file-manager', currentPath]);
      setShowNewFileModal(false);
      toast.success('File created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create file');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (files) => {
      await api.post('/api/files/delete', { path: currentPath, files });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['file-manager', currentPath]);
      setSelectedFiles([]);
      setShowDeleteConfirm(null);
      toast.success('Deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      const formData = new FormData();
      formData.append('path', currentPath);
      for (const file of files) {
        formData.append('files', file);
      }
      await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['file-manager', currentPath]);
      toast.success('Upload successful');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to upload');
    }
  });

  // Paste mutation (copy/move)
  const pasteMutation = useMutation({
    mutationFn: async () => {
      if (!clipboard) return;
      await api.post('/api/files/paste', {
        source: clipboard.sourcePath,
        dest: currentPath,
        files: clipboard.files,
        action: clipboard.action
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['file-manager']);
      setClipboard(null);
      toast.success(clipboard?.action === 'copy' ? 'Copied successfully' : 'Moved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to paste');
    }
  });

  // Handle file upload
  const handleUpload = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      uploadMutation.mutate(Array.from(files));
    }
    event.target.value = '';
  };

  // Download file
  const downloadFile = (file) => {
    const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
    window.open(`/api/files/download?path=${encodeURIComponent(filePath)}`, '_blank');
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    setClipboard({
      action: 'copy',
      sourcePath: currentPath,
      files: selectedFiles
    });
    toast.success(`${selectedFiles.length} item(s) copied to clipboard`);
  };

  // Cut to clipboard
  const cutToClipboard = () => {
    setClipboard({
      action: 'cut',
      sourcePath: currentPath,
      files: selectedFiles
    });
    toast.success(`${selectedFiles.length} item(s) cut to clipboard`);
  };

  // Filter files by search
  const filteredFiles = (data?.files || []).filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="card p-6 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Directory</h2>
        <p className="text-gray-500 dark:text-dark-muted mb-4">
          {error.response?.data?.error || 'Failed to load directory contents'}
        </p>
        <button onClick={goHome} className="btn btn-primary">
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <FolderOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">File Manager</h1>
            <p className="text-gray-500 dark:text-dark-muted text-sm">
              Browse and manage server files
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation */}
          <button
            onClick={goHome}
            className="btn btn-secondary btn-sm"
            title="Home (~)"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={goUp}
            disabled={currentPath === '~' || currentPath === homePath}
            className="btn btn-secondary btn-sm"
            title="Go up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary btn-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-dark-border mx-1" />

          {/* Actions */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="btn btn-secondary btn-sm"
            title="New Folder"
          >
            <Plus className="w-4 h-4 mr-1" />
            Folder
          </button>
          <button
            onClick={() => setShowNewFileModal(true)}
            className="btn btn-secondary btn-sm"
            title="New File"
          >
            <Plus className="w-4 h-4 mr-1" />
            File
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary btn-sm"
            title="Upload"
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />

          {/* Selection actions */}
          {selectedFiles.length > 0 && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-dark-border mx-1" />
              <button
                onClick={copyToClipboard}
                className="btn btn-secondary btn-sm"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={cutToClipboard}
                className="btn btn-secondary btn-sm"
                title="Cut"
              >
                <Scissors className="w-4 h-4" />
              </button>
              {selectedFiles.length === 1 && !data?.files?.find(f => f.name === selectedFiles[0])?.isDirectory && (
                <button
                  onClick={() => downloadFile(data?.files?.find(f => f.name === selectedFiles[0]))}
                  className="btn btn-secondary btn-sm"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(selectedFiles)}
                className="btn btn-secondary btn-sm text-red-600"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Clipboard paste */}
          {clipboard && clipboard.sourcePath !== currentPath && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-dark-border mx-1" />
              <button
                onClick={() => pasteMutation.mutate()}
                disabled={pasteMutation.isPending}
                className="btn btn-primary btn-sm"
                title="Paste"
              >
                {pasteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Clipboard className="w-4 h-4 mr-1" />
                )}
                Paste ({clipboard.files.length})
              </button>
              <button
                onClick={() => setClipboard(null)}
                className="btn btn-secondary btn-sm"
                title="Clear clipboard"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="input pl-9 w-48 h-8 text-sm"
            />
          </div>

          {/* View mode */}
          <div className="flex border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-dark-border'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-dark-border'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="card px-4 py-2 mb-4 flex items-center gap-1 text-sm overflow-x-auto">
        <button
          onClick={goHome}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border"
        >
          <Home className="w-4 h-4" />
          ~
        </button>
        {currentPath !== '~' && pathParts.map((part, index) => {
          // Don't show home path components for cleaner display
          const fullPath = '/' + pathParts.slice(0, index + 1).join('/');
          if (homePath && fullPath === homePath) return null;

          return (
            <div key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => navigateTo(fullPath)}
                className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-dark-border"
              >
                {part}
              </button>
            </div>
          );
        })}
      </div>

      {/* File List */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FolderOpen className="w-12 h-12 mb-4" />
            <p>{searchQuery ? 'No files match your search' : 'This folder is empty'}</p>
          </div>
        ) : viewMode === 'list' ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 dark:text-dark-muted border-b border-gray-200 dark:border-dark-border">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium w-24">Size</th>
                <th className="p-3 font-medium w-48">Modified</th>
                <th className="p-3 font-medium w-24">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.name}
                  onClick={(e) => toggleSelect(file, e)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  className={`border-b border-gray-100 dark:border-dark-border cursor-pointer transition-colors ${
                    selectedFiles.includes(file.name)
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-border/50'
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file)}
                      <span className={file.isDirectory ? 'font-medium' : ''}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-500 dark:text-dark-muted">
                    {file.isDirectory ? '-' : formatSize(file.size)}
                  </td>
                  <td className="p-3 text-sm text-gray-500 dark:text-dark-muted">
                    {formatDate(file.mtime)}
                  </td>
                  <td className="p-3 text-sm text-gray-500 dark:text-dark-muted font-mono">
                    {file.permissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.name}
                onClick={(e) => toggleSelect(file, e)}
                onDoubleClick={() => handleDoubleClick(file)}
                className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFiles.includes(file.name)
                    ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                    : 'hover:bg-gray-50 dark:hover:bg-dark-border/50'
                }`}
              >
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  {file.isDirectory ? (
                    <Folder className="w-10 h-10 text-amber-500" />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>
                <span className="text-sm text-center truncate w-full" title={file.name}>
                  {file.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="mt-2 text-sm text-gray-500 dark:text-dark-muted flex items-center justify-between">
        <span>
          {filteredFiles.length} items
          {selectedFiles.length > 0 && ` (${selectedFiles.length} selected)`}
        </span>
        {data?.freeSpace && (
          <span>Free: {formatSize(data.freeSpace)}</span>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <NewItemModal
          title="New Folder"
          placeholder="Folder name"
          onSubmit={(name) => createFolderMutation.mutate(name)}
          onClose={() => setShowNewFolderModal(false)}
          isPending={createFolderMutation.isPending}
        />
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <NewFileModal
          onSubmit={(name, content) => createFileMutation.mutate({ name, content })}
          onClose={() => setShowNewFileModal(false)}
          isPending={createFileMutation.isPending}
        />
      )}

      {/* Edit/View File Modal */}
      {showEditModal && (
        <FileEditorModal
          file={showEditModal}
          path={currentPath}
          onClose={() => setShowEditModal(null)}
          onSave={() => {
            queryClient.invalidateQueries(['file-manager', currentPath]);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Delete Confirmation</h3>
            <p className="text-gray-600 dark:text-dark-muted mb-4">
              Are you sure you want to delete {showDeleteConfirm.length} item(s)?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                disabled={deleteMutation.isPending}
                className="btn btn-danger"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// New Item Modal
function NewItemModal({ title, placeholder, onSubmit, onClose, isPending }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            className="input mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isPending} className="btn btn-primary">
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New File Modal
function NewFileModal({ onSubmit, onClose, isPending }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), content);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">New File</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="File name"
            className="input mb-4"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="File content (optional)"
            className="input font-mono text-sm h-48 mb-4"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isPending} className="btn btn-primary">
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// File Editor Modal
function FileEditorModal({ file, path, onClose, onSave }) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditable, setIsEditable] = useState(true);

  const filePath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;

  // Check if file is editable (text-based)
  const isTextFile = () => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const textExtensions = [
      'txt', 'md', 'log', 'conf', 'cfg', 'ini', 'json', 'yaml', 'yml',
      'xml', 'html', 'htm', 'css', 'scss', 'less', 'js', 'ts', 'jsx', 'tsx',
      'py', 'php', 'rb', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash',
      'sql', 'htaccess', 'env', 'gitignore', 'dockerignore', 'editorconfig'
    ];
    return textExtensions.includes(ext) || !ext;
  };

  useEffect(() => {
    if (!isTextFile()) {
      setIsEditable(false);
      setIsLoading(false);
      return;
    }

    // Load file content
    api.get('/api/files/read', { params: { path: filePath } })
      .then(res => {
        setContent(res.data.content || '');
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to read file');
        setIsLoading(false);
      });
  }, [filePath]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/api/files/write', { path: filePath, content });
      toast.success('File saved');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save file');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold">{file.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-border rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : !isEditable ? (
            <div className="text-center py-8 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-4" />
              <p>This file type cannot be edited in the browser.</p>
              <button
                onClick={() => window.open(`/api/files/download?path=${encodeURIComponent(filePath)}`, '_blank')}
                className="btn btn-primary mt-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </button>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 font-mono text-sm p-3 bg-gray-900 text-gray-100 rounded-lg border border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              spellCheck={false}
            />
          )}
        </div>

        {isEditable && !error && !isLoading && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

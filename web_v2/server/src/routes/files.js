import express from 'express';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Admin only for file manager
router.use(adminMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.body.path || '/tmp';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Helper to check if path is safe (no traversal)
const isPathSafe = (requestedPath) => {
  const resolved = path.resolve(requestedPath);
  // Allow access to common directories
  const allowedPaths = [
    '/home',
    '/var/www',
    '/var/log',
    '/etc',
    '/usr/local/hestia',
    '/backup',
    '/tmp'
  ];
  return allowedPaths.some(allowed => resolved.startsWith(allowed)) || resolved === '/';
};

// Helper to get file stats
const getFileInfo = (filePath, name) => {
  try {
    const stats = fs.statSync(path.join(filePath, name));
    const isDirectory = stats.isDirectory();

    // Get permissions in octal format
    const mode = stats.mode;
    const permissions = (mode & parseInt('777', 8)).toString(8).padStart(3, '0');

    return {
      name,
      isDirectory,
      size: isDirectory ? 0 : stats.size,
      mtime: Math.floor(stats.mtime.getTime() / 1000),
      permissions
    };
  } catch (e) {
    return {
      name,
      isDirectory: false,
      size: 0,
      mtime: 0,
      permissions: '000'
    };
  }
};

/**
 * GET /api/files/list
 * List directory contents
 */
router.get('/list', async (req, res) => {
  try {
    const { path: dirPath = '/' } = req.query;

    // Security check
    if (!isPathSafe(dirPath)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    const resolvedPath = path.resolve(dirPath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const entries = fs.readdirSync(resolvedPath);
    const files = entries
      .filter(name => !name.startsWith('.') || name === '.htaccess') // Hide hidden files except .htaccess
      .map(name => getFileInfo(resolvedPath, name))
      .sort((a, b) => {
        // Directories first, then alphabetically
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    // Get free space
    let freeSpace = 0;
    try {
      const dfOutput = execSync(`df -B1 "${resolvedPath}" | tail -1 | awk '{print $4}'`, { encoding: 'utf8' });
      freeSpace = parseInt(dfOutput.trim()) || 0;
    } catch (e) {
      // Ignore
    }

    res.json({ files, freeSpace, path: resolvedPath });
  } catch (error) {
    console.error('List directory error:', error);
    res.status(500).json({ error: error.message || 'Failed to list directory' });
  }
});

/**
 * GET /api/files/read
 * Read file contents
 */
router.get('/read', async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot read a directory' });
    }

    // Limit file size to 5MB for reading
    if (stats.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large to read (max 5MB)' });
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Read file error:', error);
    res.status(500).json({ error: error.message || 'Failed to read file' });
  }
});

/**
 * POST /api/files/write
 * Write file contents
 */
router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    const resolvedPath = path.resolve(filePath);
    fs.writeFileSync(resolvedPath, content || '');

    res.json({ success: true });
  } catch (error) {
    console.error('Write file error:', error);
    res.status(500).json({ error: error.message || 'Failed to write file' });
  }
});

/**
 * POST /api/files/create
 * Create a new file
 */
router.post('/create', async (req, res) => {
  try {
    const { path: dirPath, name, content = '' } = req.body;

    if (!dirPath || !name) {
      return res.status(400).json({ error: 'Path and name are required' });
    }

    // Validate name
    if (name.includes('/') || name.includes('..')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const fullPath = path.join(dirPath, name);

    if (!isPathSafe(fullPath)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    if (fs.existsSync(fullPath)) {
      return res.status(409).json({ error: 'File already exists' });
    }

    fs.writeFileSync(fullPath, content);
    res.json({ success: true });
  } catch (error) {
    console.error('Create file error:', error);
    res.status(500).json({ error: error.message || 'Failed to create file' });
  }
});

/**
 * POST /api/files/mkdir
 * Create a new directory
 */
router.post('/mkdir', async (req, res) => {
  try {
    const { path: dirPath, name } = req.body;

    if (!dirPath || !name) {
      return res.status(400).json({ error: 'Path and name are required' });
    }

    // Validate name
    if (name.includes('/') || name.includes('..')) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }

    const fullPath = path.join(dirPath, name);

    if (!isPathSafe(fullPath)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    if (fs.existsSync(fullPath)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }

    fs.mkdirSync(fullPath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Create directory error:', error);
    res.status(500).json({ error: error.message || 'Failed to create directory' });
  }
});

/**
 * POST /api/files/delete
 * Delete files/directories
 */
router.post('/delete', async (req, res) => {
  try {
    const { path: dirPath, files } = req.body;

    if (!dirPath || !files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Path and files are required' });
    }

    for (const file of files) {
      // Validate name
      if (file.includes('/') || file.includes('..')) {
        return res.status(400).json({ error: `Invalid file name: ${file}` });
      }

      const fullPath = path.join(dirPath, file);

      if (!isPathSafe(fullPath)) {
        return res.status(403).json({ error: 'Access denied to this path' });
      }

      if (!fs.existsSync(fullPath)) {
        continue; // Skip non-existent files
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete' });
  }
});

/**
 * POST /api/files/paste
 * Copy or move files
 */
router.post('/paste', async (req, res) => {
  try {
    const { source, dest, files, action } = req.body;

    if (!source || !dest || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Source, dest, and files are required' });
    }

    if (!isPathSafe(source) || !isPathSafe(dest)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(dest, file);

      if (!fs.existsSync(sourcePath)) {
        continue;
      }

      if (action === 'copy') {
        // Copy
        const stats = fs.statSync(sourcePath);
        if (stats.isDirectory()) {
          execSync(`cp -r "${sourcePath}" "${destPath}"`);
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
      } else {
        // Move
        fs.renameSync(sourcePath, destPath);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Paste error:', error);
    res.status(500).json({ error: error.message || 'Failed to paste' });
  }
});

/**
 * POST /api/files/upload
 * Upload files
 */
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    res.json({ success: true, count: req.files?.length || 0 });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload' });
  }
});

/**
 * GET /api/files/download
 * Download a file
 */
router.get('/download', async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Access denied to this path' });
    }

    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download a directory' });
    }

    res.download(resolvedPath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Failed to download' });
  }
});

export default router;

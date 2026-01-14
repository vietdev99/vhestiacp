# VHestiaCP Panel v2

Modern web panel for VHestiaCP built with React + Node.js.

## Features

- React 18 + TailwindCSS for modern UI
- Dark/Light mode support
- JWT authentication
- Direct HTTPS server (port 9093)
- PM2 process management
- Real-time updates (coming soon)

## Structure

```
web_v2/
├── server/          # Express.js API server
│   └── src/
│       ├── index.js           # Main entry
│       ├── routes/            # API routes
│       ├── middleware/        # Auth, etc.
│       └── utils/             # Hestia command helpers
├── client/          # React SPA
│   └── src/
│       ├── pages/             # Page components
│       ├── components/        # Shared components
│       ├── context/           # React context (auth, theme)
│       └── utils/             # API client, helpers
├── ecosystem.config.cjs       # PM2 config
└── package.json
```

## Installation

### 1. Install dependencies

```bash
cd /usr/local/hestia/web_v2

# Server
cd server && npm install

# Client
cd ../client && npm install && npm run build
```

### 2. Start with PM2

```bash
cd /usr/local/hestia/web_v2
pm2 start ecosystem.config.cjs
pm2 save
```

### 3. Access

Open https://your-server:9093

## Development

```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start client dev server
cd client && npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - List users
- `GET /api/users/:username` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/:username` - Update user
- `DELETE /api/users/:username` - Delete user
- `POST /api/users/:username/suspend` - Suspend user
- `POST /api/users/:username/unsuspend` - Unsuspend user

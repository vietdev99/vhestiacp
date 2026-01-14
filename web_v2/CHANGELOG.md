# Changelog

All notable changes to VHestiaCP Panel v2 will be documented in this file.

## [Unreleased]

### Added

- **Backup Management** - Full backup management system
  - **Backups List Page** (`/backups`)
    - Display all backups with filename, date, size, type, runtime
    - Create Backup button (schedules backup via HestiaCP queue)
    - Download backup file directly
    - Delete backup with confirmation
    - Link to Backup Exclusions page
  - **Backup Detail Page** (`/backups/:filename`)
    - View backup contents organized by category (Web, Mail, DNS, DB, Cron, User Directories)
    - Restore All button to restore entire backup
    - Restore individual items selectively
    - Download backup file
  - **Backup Exclusions Page** (`/backups/exclusions`)
    - View current backup exclusions by category
    - Edit mode to add/remove exclusions with tag-style UI
    - Categories: Web Domains, Mail Domains, Databases, User Directories

- **New API Endpoints** (`/api/backups`)
  - `GET /api/backups` - List all user backups
  - `GET /api/backups/:filename` - Get backup details with parsed contents
  - `POST /api/backups` - Schedule new backup
  - `DELETE /api/backups/:filename` - Delete backup
  - `GET /api/backups/:filename/download` - Get download link
  - `GET /api/backups/:filename/file` - Stream backup file download
  - `POST /api/backups/:filename/restore` - Restore backup (all or specific items)
  - `GET /api/backups/config/exclusions` - Get backup exclusions
  - `PUT /api/backups/config/exclusions` - Update backup exclusions

- **Cron Job Management** - Full CRUD support for cron jobs
  - List all cron jobs with schedule and command display
  - Add new cron jobs with quick presets (every minute, hourly, daily, weekly, monthly)
  - Edit existing cron jobs
  - Delete cron jobs with confirmation
  - Suspend/Unsuspend (Activate) cron jobs
  - Toggle email notifications for cron reports (v-add-cron-reports / v-delete-cron-reports)
  - Search/filter cron jobs by command

- **New API Endpoints** (`/api/cron`)
  - `GET /api/cron` - List all cron jobs with notification status
  - `GET /api/cron/:id` - Get single cron job
  - `POST /api/cron` - Create new cron job
  - `PUT /api/cron/:id` - Update cron job
  - `DELETE /api/cron/:id` - Delete cron job
  - `POST /api/cron/:id/suspend` - Suspend cron job
  - `POST /api/cron/:id/unsuspend` - Unsuspend cron job
  - `POST /api/cron/notifications/enable` - Enable cron email notifications
  - `POST /api/cron/notifications/disable` - Disable cron email notifications

### Changed
- **Menu Rename**: "Services" renamed to "Install/Uninstall" in admin menu for clarity

### Fixed
- Dropdown menu overflow issue - now uses `createPortal` to render menus outside parent container, preventing clipping by `overflow: hidden`
- **HestiaCP Error Messages** - Fixed error message extraction from HestiaCP commands. HestiaCP returns error messages in stdout (not stderr), updated `hestia.js` to properly capture and display these messages
- **Backup Exclusions Parsing** - Fixed parsing of backup exclusions. HestiaCP returns exclusions as objects (keys are excluded items), not comma-separated strings
- **Backup Schedule Error Handling** - Improved error messages for backup scheduling (e.g., "A backup task is already scheduled")

## [1.0.0] - 2025-01-13

### Added
- Initial release of VHestiaCP Panel v2
- React 18 + TailwindCSS modern UI
- Dark/Light mode support
- JWT authentication with secure cookies
- Direct HTTPS server on port 9093
- PM2 process management

#### Features
- **Dashboard** - Overview with system stats
- **Users** - User management (admin only)
  - List, add, edit, delete users
  - Suspend/unsuspend users
  - Login as user functionality
  - SSH key management
  - User activity logs
- **Web Domains** - Web hosting management
  - List, add, edit, delete domains
  - SSL certificate management
  - Quick install apps (WordPress, etc.)
  - Access/error logs viewer
- **DNS** - DNS zone management
  - List, add, edit, delete DNS zones
  - DNS record management (A, AAAA, CNAME, MX, TXT, NS, SRV)
- **Mail** - Mail domain management
  - List, add mail domains
- **Databases** - Database management
  - List, add databases
- **Backups** - Backup management
  - List backups
  - Create/restore/download backups
- **Packages** - Hosting package management (admin only)
  - List, add, edit, delete packages
- **Services/Install** - Service management (admin only)
  - View installed services
  - Install/uninstall services

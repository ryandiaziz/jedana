# Changelog

All notable changes to Jedana (Jejak Dana) are documented here.
Format: Keep a Changelog · Versioning: SemVer.

## [Unreleased]

### Added
- Floating quick-action header (new transaction, search, previous/next period) and a back-to-top
  button on every scrolling page; respects `prefers-reduced-motion` and keyboard navigation.
- Offline-first ledger: wallets (envelope budgeting), income/expense transactions, multi-tag,
  payees, void (soft cancel), transaction search and CSV export.
- Budgeting per tag and recurring transactions with automatic due-date generation.
- Statistics: spending anomaly detection and top payees.
- Google OAuth login with anonymous-data claim on first login, and full IndexedDB wipe on logout.
- Remote MCP server (8 tools) with per-user API keys manageable from Settings.
- PWA support (installable, offline app shell, network-only `/api`).

### Changed
- Theme defaults to dark with pre-paint initialisation to avoid a flash of light UI.
- Sync now triggers automatically (Dexie hooks, `online`, visibility, 5-minute interval) and pushes
  only changed records; pull cursor is issued by the server (`X-Sync-Cursor`).
- Web initial bundle split per route.

### Security
- Node.js runtime pinned to 24.22.1 across dev, Docker and CI (CVE-2026-111497, brotli decoder).
- Request bodies with `Content-Encoding` other than identity are rejected (HTTP 415); JSON body
  limit reduced from 50 MB to 5 MB.

### Fixed
- Logout no longer leaves a stale sync cursor behind.

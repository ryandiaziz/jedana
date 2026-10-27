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
- Zero critical and high npm dependency advisories with automated blocking security gate (`scripts/verify-security.sh --strict`).
- Fail-fast environment variable validation at startup with no public fallback JWT secrets in code or compose.
- Conditional Google OAuth activation with fail-closed guard preventing exposure of mock credentials when unconfigured.
- Real client IP resolution (`X-Real-IP`) with rate limiting per client IP on `/api/*` and handshake limit on auth endpoints.
- Dedicated multi-stage rate limiting on `/mcp` (pre-auth 240 req/min per IP, post-auth 120 req/min per user key).
- Origin security headers (HSTS with `includeSubDomains`, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, and sha256 hash-locked CSP for theme script) via host Nginx vhost template (`deploy/nginx/jedana.my.id.conf`).
- Hardened server container running as non-root user `node` (`uid=1000`) with scoped permissions.
- Node.js runtime pinned to 24.22.1 across dev, Docker and CI (CVE-2026-111497, brotli decoder).
- Request bodies with `Content-Encoding` other than identity are rejected (HTTP 415); JSON body
  limit reduced from 50 MB to 5 MB.

### Fixed
- Logout no longer leaves a stale sync cursor behind.

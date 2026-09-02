# Jedana (Jejak Dana)

Jedana is an offline-first personal financial management application designed to help users track income and expenses securely, flexibly, and responsively.

## 🏗️ Project Structure (Monorepo)

This project is built using an **NPM Workspaces** monorepo architecture:

```text
jedana/
├── apps/
│   ├── web/        # Frontend Application (React 19 + Vite + TailwindCSS + Dexie IndexedDB)
│   └── server/     # Backend Application (NestJS + PostgreSQL + node-pg-migrate)
└── packages/
    └── shared/     # Shared Package (Shared types, interfaces, & utilities)
```

---

## 🚀 Getting Started with Development

Follow these steps to set up and run the application in a local development environment.

### 1. Prerequisites

Before starting, ensure your system has the following installed:
- **Node.js**: `v18.0.0` or higher (v20 LTS recommended)
- **NPM**: `v9.0.0` or higher
- **PostgreSQL**: `v14.0` or higher (running locally or via Docker)

### 2. Repository Cloning & Dependency Installation

Clone this repository to your local machine, then install all workspace dependencies from the root directory:

```bash
# Clone the repository
git clone <repository-url>
cd jedana

# Install all workspace dependencies
npm install
```

### 3. Environment Variables Configuration

The backend application (`apps/server`) requires environment variables for database connection and authentication.

Create a `.env` file inside the `apps/server/` directory:

**Path:** `apps/server/.env`

```env
# PostgreSQL Database Connection
DATABASE_URL="postgres://username:password@localhost:5432/jedana"

# Authentication Configuration
JWT_SECRET="replace_with_your_local_jwt_secret"

# Google OAuth (Optional for Google login)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

> **Note:** Make sure the `jedana` database is created in PostgreSQL before running migrations:
> ```sql
> CREATE DATABASE jedana;
> ```

### 4. Run Database Migrations

Execute database migration scripts to set up the required schema and tables for the backend:

```bash
# From the root directory
npm run migrate:up --workspace=apps/server
```

*(Alternatively, run `npm run migrate:up` directly inside the `apps/server` directory)*.

### 5. Running the Application (Development Server)

You can run both the frontend and backend services concurrently using a single command from the root directory:

```bash
# Run Frontend (Web) & Backend (Server) concurrently
npm run dev
```

This command will start:
- **Web App (Frontend)**: [http://localhost:5173](http://localhost:5173)
- **API Server (Backend)**: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Available Development Scripts

| Command | Execution Location | Description |
| :--- | :--- | :--- |
| `npm run dev` | Root | Runs web & server concurrently in watch mode |
| `npm run build` | Root | Builds all workspace applications for production |
| `npm run dev --workspace=apps/web` | Root | Runs only the Web (Frontend) application |
| `npm run start:dev --workspace=apps/server` | Root | Runs only the Server (Backend) application |
| `npm run lint` | `apps/web` / `apps/server` | Lints code using ESLint rules |
| `npm run test` | `apps/server` | Runs unit tests on the server |

---

## 🏛️ Application Architecture & Core Concepts

- **Offline-First**: All transactions and wallet data are saved locally in the browser first via **IndexedDB** (Dexie.js).
- **Data Synchronization**: Upon user login, local data is synced to the backend (**NestJS** & **PostgreSQL**).
- **Privacy & Security (Physical Wipe on Logout)**: Upon logging out, local IndexedDB data is physically purged from the device to protect user privacy.
- **MCP Server (AI Agent Integration)**: Supports remote AI agents (Claude Desktop, Cursor, etc.) to automate financial tracking via the Model Context Protocol. See [MCP Documentation](docs/MCP.md) for full integration details.

---

## 📄 License

[MIT](LICENSE)

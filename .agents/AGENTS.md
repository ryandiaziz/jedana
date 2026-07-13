# Project Rules for Jedana Web Application

## React 2025 Folder Structure

All React frontend changes inside `apps/web/src` must strictly adhere to the modular React 2025 folder structure guidelines. 

### Key Rules:
1. **Domain Features**: Group domain-specific features under `src/features/<feature-name>/`. Avoid creating files directly under `components/` or `services/` if they only relate to a specific feature/domain (e.g. transactions, wallets, tags, sync).
2. **Barrel Exports**: Every component folder (e.g., `src/components/common/SmartInput/`) and page folder (e.g., `src/pages/Dashboard/`) must have an `index.ts` file that default or named exports the main element.
3. **Common Components**: Standard reusable, domain-agnostic UI elements (buttons, inputs, toggle, modal) must go under `src/components/common/`.
4. **Layout Components**: Page frames and shells (such as Sidebar, Header) must go under `src/components/layout/`.
5. **Global Contexts**: Cross-cutting context wrappers (such as AuthContext, ThemeContext) must reside in `src/context/`.
6. **General Utilities**: General helpers and utilities should be placed in `src/utils/` (e.g. `cn.ts`).

For detailed implementation workflow and path structures, please refer to the global skill: `react-folder-structure` or the file `/home/ryan/.gemini/config/skills/react-folder-structure/SKILL.md`.

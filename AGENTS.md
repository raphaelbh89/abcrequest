<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🚨 MANDATORY INSTRUCTION FOR AI AGENTS (BẮT BUỘC ĐỌC KHI BẮT ĐẦU)

Before writing any code or answering user requests on this project, you **MUST READ** the master handover documentation file:
👉 **[`AGENT_HANDOVER.md`](file:///D:/ABCRequest/AGENT_HANDOVER.md)** and **[`CHANGELOG.md`](file:///D:/ABCRequest/CHANGELOG.md)**

### Key Rules You Must Always Follow:
1. **Never read all code files from scratch**: `AGENT_HANDOVER.md` contains the full architecture, database schema, role-based access rules (RBAC), and all API specifications.
2. **Prioritize Internal Inventory**: When searching items, internal stock takes absolute priority before external search / AI proposals.
3. **Prevent Duplicate Items (Anti-Deduplication)**: Never create duplicate items with matching names in the database. Use `mergeDuplicateItems()` from `lib/deduplicate-items.ts` or increment existing stock.
4. **Database Transactions**: All multi-table updates (stock deduction, request approvals, disbursements, returns) must be wrapped inside `prisma.$transaction`.
5. **Always Run Tests**: Before completing any task, execute `npm test` to verify that all 22 test suites (89+ tests) pass 100%.
6. **Update Changelog & Handover**: Whenever a new feature, bugfix, or API is added, update `CHANGELOG.md` and `AGENT_HANDOVER.md` accordingly before committing.

# ADHD Tasks

AI-powered task & project manager tailor-made for people with ADHD.  
It automatically builds a daily plan that balances focus, variety, and energy while respecting real-world constraints such as deadlines, personal productivity peaks, and cognitive load.

---

## ✨ Key Features

| Area | Highlights |
|------|------------|
| Projects | Priorities, categories, soft/hard deadlines, pause/resume |
| Tasks | Complexity estimate, energy type, dependencies, tags, Pomodoro timers |
| User Preferences | Daily limits, productive hours, goal tracking, focus/flow modes |
| AI Planner (OpenAI) | Generates an explainable day plan that mixes 2-4 projects, balances easy/hard tasks, and honors energy levels |
| UX for ADHD | Clean UI, color-coded priorities, drag-and-drop ordering, focus mode, gentle notifications, gamified progress |
| Analytics | History of plans, completion trends, feedback loop to improve future planning |

---

## 🛠️ Tech Stack

Frontend | Backend | Database | Dev Tools
---------|---------|----------|----------
React 18 + Vite + TypeScript | Node.js 20 + Express + TypeScript | PostgreSQL 15 | Prisma ORM
Tailwind CSS | OpenAI SDK | Vercel Postgres (cloud) / Local Postgres | pnpm 8 workspaces (monorepo)
Zustand (state) | JWT Auth with `jsonwebtoken` | Prisma Migrate & Seed | ESLint / Prettier / Husky
React Router v6 | | | Vitest + Supertest

---

## 📂 Project Structure (Monorepo)

```
adhd-tasks/
├─ apps/
│  ├─ frontend/      # React client
│  └─ backend/       # Express API
├─ prisma/           # Prisma schema & migrations
├─ packages/
│  └─ ui/            # Shared UI components (optional)
├─ .env.example
├─ package.json      # pnpm workspace root
└─ README.md
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-org/adhd-tasks.git
cd adhd-tasks
pnpm install      # requires pnpm ≥ 8
```

### 2. Configure Environment

Copy and fill in the secrets:

```bash
cp .env.example .env
```

Minimum variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (`postgres://user:password@host:5432/db`) |
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `JWT_SECRET` | Random string for signing tokens |
| `PORT` | (optional) backend port, default **5000** |

### 3. Database Setup

```bash
pnpm db:migrate      # runs `prisma migrate dev`
pnpm db:seed         # optional initial data
```

### 4. Run in Development

```bash
pnpm dev            # concurrently runs backend and frontend
# or individually
pnpm dev:backend
pnpm dev:frontend
```

The client is served at `http://localhost:5173`, the API at `http://localhost:5000`.

---

## 🧩 NPM Scripts (root)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend + backend concurrently |
| `pnpm dev:frontend` | Frontend only (Vite dev server) |
| `pnpm dev:backend` | Backend only (ts-node watch) |
| `pnpm build` | Full production build (frontend & backend) |
| `pnpm lint` | ESLint check |
| `pnpm test` | Unit & API tests (Vitest) |
| `pnpm db:migrate` | Prisma migrations |
| `pnpm db:seed` | Seed database |

---

## 📦 Deployment

### Local Docker (optional)

```bash
docker compose up -d      # spins up Postgres
pnpm build
pnpm start                # serves built backend, frontend served by Vite preview or Nginx
```

### Vercel (recommended)

1. Import the repo in Vercel.
2. Choose `pnpm` as the package manager; root directory is the repo root.
3. Add Environment Variables (`DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`).
4. Select **Vercel Postgres** in the **Resources** tab (auto-provisions `DATABASE_URL`).
5. Set Build Command: `pnpm build`  
   Output directory: `apps/frontend/dist`.
6. The backend (Express) is built as Vercel Serverless/Edge Functions from `apps/backend/api`.

---

## 🤝 Contributing

1. Fork the repo & create a feature branch:
   ```
   git checkout -b feat/short-description
   ```
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
3. Run `pnpm lint && pnpm test` before pushing.
4. Open a Pull Request; the CI will run lint, tests, and type-check.
5. Be kind and inclusive ❤️ – maintainers will review ASAP.

---

## 📄 License

MIT © 2025 ADHD Tasks Contributors

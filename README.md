# Student Skill Exchange Platform

Deployment-ready merged frontend and backend for the Student Skill Exchange Platform.

The static frontend is in `public/`; the Express and TypeScript API is in `src/`; Prisma and the PostgreSQL schema are in `prisma/`. Express serves both the website and `/api` from one origin.

## Setup

1. Install Node.js 22.18 or later and PostgreSQL.
2. Copy `.env.example` to `.env` and add the local PostgreSQL password and a strong JWT secret.
3. Run `npm install`.
4. Run `npm run prisma:generate`.
5. Run `npm run db:migrate -- --name init_final_schema` for a new local database.
6. Run `npm run dev`.

Open `http://localhost:5000`. The API health endpoint is `http://localhost:5000/api/health`.

See `GITHUB-AND-RENDER-GUIDE.txt` for GitHub Desktop and Render Blueprint instructions.

The repository intentionally excludes `.env`, uploaded PDFs, `node_modules` and generated Prisma files.

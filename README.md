# Hulu Market

Hulu Market is a monorepo-style project with two independent npm applications:

- `frontend/` — Next.js App Router, TypeScript, Tailwind CSS, and ESLint.
- `backend/` — Express.js and TypeScript API.

The frontend includes the Hulu Market navigation shell. Marketplace pages,
database, and ORM are not included. The backend exposes its health response at
`/health`, and the frontend exposes one at `/api/health`.

## Requirements

- Node.js 20.9 or later
- npm

## Run the frontend

In a terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at <http://localhost:3000>. Its root route displays the
Hulu Market navigation shell.

## Run the backend

In a second terminal:

```powershell
cd backend
npm install
npm run dev
```

The backend runs at <http://localhost:4001>; check its health at
<http://localhost:4001/health>.

Copy the relevant `.env.example` to `.env` in an application folder to customize
its local configuration. The defaults work without an `.env` file.

## Production builds

Build and run each application from its own folder:

```powershell
# frontend
npm run build
npm run start

# backend
npm run build
npm start
```

## Structure

```text
frontend/
  app/                 Next.js App Router layout, landing page, and health route
  components/layout/   Reusable desktop and mobile sidebar navigation
  public/              Static assets
  .env.example         Frontend environment-variable example
  next.config.ts       Next.js configuration
  postcss.config.mjs   Tailwind/PostCSS integration
  tailwind.config.ts   Tailwind content and theme configuration
backend/
  src/
    app.ts             Express middleware and health route
    server.ts          Environment validation and HTTP server startup
  .env.example         Backend environment-variable example
  tsconfig.json        TypeScript build configuration
```

Each application has its own `package.json` and lockfile, so dependencies,
development servers, and production builds are managed independently. Generated
dependencies, build output, and environment files are excluded by the root
`.gitignore`; `.env.example` files are intentionally tracked.

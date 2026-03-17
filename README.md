Backend for the Scheduled app.

Setup

1. Copy `.env.example` to `.env` and adjust if needed.

2. From the `backend` folder install dependencies:

```bash
npm install
```

3. Generate Prisma client and push schema to SQLite file:

```bash
npx prisma generate
npx prisma db push
```

4. (Optional) Seed sample data:

```bash
npm run prisma:seed
```

5. Run dev server:

```bash
npm run dev
```

API endpoints (basic):
- GET /health
- GET/POST /groceries
- GET/POST /recipes
- GET/POST /calendar
- POST /generate-list

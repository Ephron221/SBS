# Smart Boutique System (SBS)

SBS is a full-stack boutique management platform with authentication, inventory, POS-style sales, finance, and reporting flows.

## Stack
- Frontend: React + TypeScript + Vite + React Router + Axios
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL

## Features
- Auth — JWT login, role-based access (SUPER_ADMIN / MANAGER / SELLER)
- Products — create, edit, discontinue, search/filter
- Stock — adjust stock up/down with reason tracking and history
- POS / Sales — full cart with product search, quantity control, customer name, payment method
- Finance — revenue, expenses, net profit, stock value
- Reports — summary dashboard
- Users — SUPER_ADMIN can create, activate/deactivate team members
- Notifications & Audit trail

## Local development

### 1. Install dependencies
```bash
npm install
```

### 2. Configure the backend
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set DATABASE_URL to your PostgreSQL connection string
```

### 3. Run Prisma migrations and seed
```bash
npm run db:generate --workspace backend
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

### 4. Start both servers
```bash
npm run dev
```

Frontend → http://localhost:5173  
Backend  → http://localhost:4000

### Demo credentials
| Role        | Email              | Password           |
|-------------|--------------------|--------------------|
| Super Admin | admin@sbs.rw       | Diano21@Esron21%   |
| Manager     | manager@sbs.rw     | Diano21@Esron21%   |
| Seller      | seller@sbs.rw      | Diano21@Esron21%   |

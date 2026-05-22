# AeroNetB Aerospace — Supply Chain Management System
## Task 2: Implementation
**Module:** 5CM506 Data Driven Systems | **Student ID:** 100774690

---

## System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│  PostgreSQL 15+     │    │  MongoDB 7.0+        │
│  (aeronetb schema)  │    │  (aeronetb_docs)     │
│  15 tables          │    │  6 collections       │
│  Structured data    │    │  Semi/Unstructured   │
└─────────┬───────────┘    └──────────┬───────────┘
          │                           │
          └───────────┬───────────────┘
                      │
          ┌───────────▼───────────────┐
          │  Node.js / Express API    │
          │  JWT Auth + RBAC          │
          │  Port 3000                │
          └───────────┬───────────────┘
                      │
          ┌───────────▼───────────────┐
          │  HTML/CSS/JS Dashboard    │
          │  Served statically        │
          │  Role-specific views      │
          └───────────────────────────┘
```

---

## Prerequisites

- **Node.js** 18+ (`node --version`)
- **PostgreSQL** 15+ (running on localhost:5432)
- **MongoDB** 7.0+ (running on localhost:27017)

---

## Setup Instructions

### 1. Clone / Extract
```
unzip 100774690_DII.zip
cd task2
```

### 2. Configure PostgreSQL

```sql
-- In psql as superuser:
CREATE USER aeronetb_user WITH PASSWORD 'your_password';
CREATE DATABASE aeronetb OWNER aeronetb_user;
GRANT ALL PRIVILEGES ON DATABASE aeronetb TO aeronetb_user;
```

Run the DDL and DML scripts:
```bash
psql -U aeronetb_user -d aeronetb -f sql/ddl.sql
psql -U aeronetb_user -d aeronetb -f sql/dml.sql
```

### 3. Configure the Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL password and any other settings
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Seed MongoDB

```bash
cd backend
node mongo-seed.js
```

### 6. Start the Server

```bash
npm start
# or for development with hot-reload:
npm run dev
```

The server starts on **http://localhost:3000**

---

## Accessing the Dashboard

Open **http://localhost:3000** in a browser.

### Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Procurement Officer | a.papadaki@aeronetb.com | Password123! |
| Quality Inspector | d.stavros@aeronetb.com | Password123! |
| Supply Chain Manager | e.christodoulou@aeronetb.com | Password123! |
| Equipment Engineer | n.angelopoulos@aeronetb.com | Password123! |
| Auditor (Read-Only) | m.katsaros@aeronetb.com | Password123! |

> **Note:** The password hashes in the DML are placeholder hashes. For a live deployment,
> re-hash using bcrypt: `node -e "const b=require('bcryptjs');b.hash('Password123!',10).then(console.log)"`
> and UPDATE the employee rows with the real hashes.

---

## API Endpoints Summary

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| POST | /api/auth/login | Login → JWT | Public |
| GET | /api/suppliers | List all suppliers | Any |
| GET | /api/suppliers/:id | Supplier detail + accreditations | Any |
| POST | /api/suppliers | Create supplier | ProcurementOfficer |
| PUT | /api/suppliers/:id | Update supplier | ProcurementOfficer |
| POST | /api/suppliers/:id/accreditations | Add accreditation | ProcurementOfficer |
| GET | /api/parts | Parts catalogue | Any |
| GET | /api/parts/:id | Part detail | Any |
| GET | /api/orders | List orders (filterable) | Any |
| GET | /api/orders/:id | Order with items + shipments | Any |
| POST | /api/orders | Create purchase order | ProcurementOfficer |
| PUT | /api/orders/:id/status | Update order status | ProcurementOfficer |
| GET | /api/shipments | All shipments + tracking | Any |
| GET | /api/shipments/:id | Shipment + full tracking | Any |
| POST | /api/shipments/:id/updates | Add tracking checkpoint | Any |
| GET | /api/qcreports | List QC reports | Any |
| GET | /api/qcreports/:id | QC report detail | Any |
| POST | /api/qcreports | Create QC report | QualityInspector |
| PUT | /api/qcreports/:id | Update draft report | QualityInspector |
| POST | /api/qcreports/:id/approve | Approve (lock) report | QualityInspector |
| GET | /api/certifications | List certifications | Any |
| GET | /api/certifications/:id | Certification detail | Any |
| POST | /api/certifications/:id/approve | Approve certification | QualityInspector |
| GET | /api/equipment | List equipment | EquipmentEngineer |
| PUT | /api/equipment/:id/status | Update equipment status | EquipmentEngineer |
| GET | /api/iot/:equipmentId | IoT readings (last 100) | EquipmentEngineer |
| GET | /api/iot/:equipmentId/latest | Latest IoT reading | EquipmentEngineer |
| POST | /api/iot/:equipmentId | Ingest IoT reading | EquipmentEngineer |
| GET | /api/dashboard/kpis | Supplier KPI aggregation | SupplyChainManager |
| GET | /api/dashboard/orders-by-status | Status breakdown | Any |
| GET | /api/dashboard/qc-summary | QC pass/fail counts | Any |
| GET | /api/dashboard/equipment-status | Equipment counts | Any |
| GET | /api/dashboard/recent-activity | Last 20 audit entries | Any |
| GET | /api/audit | Paginated audit log | Auditor |
| GET | /api/health | Health check | Public |

---

## File Structure

```
task2/
├── sql/
│   ├── ddl.sql               ← Schema & 15 table definitions
│   └── dml.sql               ← Seed data for all tables
├── backend/
│   ├── server.js             ← Express entry point
│   ├── package.json
│   ├── .env.example
│   ├── mongo-seed.js         ← MongoDB collection seed script
│   ├── db/
│   │   ├── postgres.js       ← PostgreSQL connection pool
│   │   └── mongo.js          ← MongoDB client singleton
│   ├── middleware/
│   │   ├── auth.js           ← JWT verification
│   │   └── rbac.js           ← Role-based access control
│   └── routes/
│       ├── auth.js           ← Login
│       ├── suppliers.js
│       ├── parts.js
│       ├── orders.js
│       ├── shipments.js
│       ├── qcreports.js
│       ├── certifications.js
│       ├── equipment.js
│       ├── iot.js
│       ├── dashboard.js
│       └── audit.js
└── frontend/
    └── index.html            ← Single-page dashboard (HTML/CSS/JS)
```

---

## Security Implementation

- **JWT tokens** expire after 8 hours
- **Bcrypt** password hashing (cost factor 10)
- **RBAC** enforced server-side on every endpoint
- **Immutability** enforced for approved QC reports and certifications
- **Audit log** records every action with employee ID, entity, and timestamp
- **Parameterised queries** prevent SQL injection throughout

---

## Deployment Note

This system is configured for **local deployment**. All dependencies are free and open-source:
- PostgreSQL (free, open-source)
- MongoDB Community Edition (free)
- Node.js (free, open-source)

For cloud deployment, the `.env` file would be updated with connection strings for
services such as Supabase (PostgreSQL) and MongoDB Atlas (MongoDB), both of which
offer free tiers suitable for this demonstration.

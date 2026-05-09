# India Location Data API Platform

Full-stack capstone project for serving structured India location data through a secure B2B API, with an admin dashboard and demo client.

## Tech Stack

- PostgreSQL for normalized location and API usage data
- Node.js + Express + Prisma for backend APIs
- React + Vite for admin and demo client UI
- Docker Compose for local PostgreSQL

## Run In VS Code

1. Open this folder in VS Code.
2. Open a terminal in VS Code.
3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Install backend dependencies:

```bash
cd backend
npm install
copy .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

5. Open a second VS Code terminal and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

6. Open the frontend URL shown by Vite, usually:

```text
http://localhost:5173
```

## Test API Key

The seed script creates this demo B2B client:

- API key: `demo_key_123`
- API secret: `demo_secret_456`

Use headers:

```text
x-api-key: demo_key_123
x-api-secret: demo_secret_456
```

## Useful Backend URLs

- Health: `GET http://localhost:4000/health`
- States: `GET http://localhost:4000/api/v1/locations/states`
- Districts: `GET http://localhost:4000/api/v1/locations/districts?stateId=1`
- Sub-districts: `GET http://localhost:4000/api/v1/locations/sub-districts?districtId=1`
- Villages: `GET http://localhost:4000/api/v1/locations/villages?search=pur&page=1&limit=10`
- Admin overview: `GET http://localhost:4000/api/v1/admin/overview`

## Import Full Village Data

The seed file contains sample data so the project runs immediately. For a larger CSV, use:

```bash
cd backend
npm run import:villages -- ../data/villages.csv
```

Expected CSV headers:

```text
state_code,state_name,district_code,district_name,sub_district_code,sub_district_name,village_code,village_name,pincode,latitude,longitude,population
```

# Macao Rewards Tracker Deployment

## Target (low-cost trial)

- Frontend: Vercel (Hobby)
- Backend: Render (Free Web Service)
- Database: Neon Postgres (Free)

## 1) Prerequisites

- GitHub repo contains latest code
- Accounts: Vercel, Render, Neon
- Local tools:
  - Node.js 20+
  - Java 21
  - Maven 3.9+

## 2) Neon (database)

1. Create a Neon project and database.
2. Copy connection values: host, db name, user, password.
3. Prepare JDBC URL:

`jdbc:postgresql://<host>/<db>?sslmode=require`

## 3) Render (backend)

Create a new **Web Service** from GitHub:

- Root Directory: `backend`
- Build Command: `mvn -DskipTests package`
- Start Command: `mvn spring-boot:run`

Set environment variables:

- `SPRING_PROFILES_ACTIVE=prod`
- `SPRING_DATASOURCE_URL=jdbc:postgresql://<host>/<db>?sslmode=require`
- `SPRING_DATASOURCE_USERNAME=<user>`
- `SPRING_DATASOURCE_PASSWORD=<password>`
- `APP_CORS_ALLOWED_ORIGINS=https://<vercel-domain>`
- `JWT_SECRET=<long-random-secret>`

After deployment, note backend URL:

`https://<render-service>.onrender.com`

## 4) Vercel (frontend)

Create a new project from GitHub:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Set environment variable:

- `VITE_API_BASE_URL=https://<render-service>.onrender.com`

Redeploy and note frontend URL:

`https://<project>.vercel.app`

## 5) CORS notes

Backend CORS now reads from:

- `APP_CORS_ALLOWED_ORIGINS` (comma-separated list)

Example:

`APP_CORS_ALLOWED_ORIGINS=https://my-app.vercel.app,https://my-custom-domain.com`

## 6) Verify checklist

- Can register/login from frontend URL
- Can add weekend prize records
- Can consume coupons
- Can open and use consumption plan dialog
- Data persists after page refresh

## 7) Known free-tier behavior

- Render Free may cold start (first request can be slow)
- Limited monthly resources; suitable for small friend trial

## 8) Quick rollback

- Vercel: redeploy previous successful deployment
- Render: rollback to previous deploy
- Neon: restore from branch/backup if needed

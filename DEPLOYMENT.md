# Deployment Guide

This guide explains how to deploy the ClassroomIO stack (Dashboard + API) on a Hostinger VPS using CloudPanel, with MinIO for storage and PostgreSQL for the database.

## Prerequisites

- **Hostinger VPS** running **Ubuntu 22.04**.
- **CloudPanel** installed on the VPS (Free version).
- **Domain Name** pointing to your VPS IP (e.g., `app.yourdomain.com`, `api.yourdomain.com`, `s3.yourdomain.com`, `console.yourdomain.com`).

---

## 1. CloudPanel Setup

### Install CloudPanel
If not already installed, run:
```bash
curl -sS https://installer.cloudpanel.io/ce/v2/install.sh -o install.sh; \
sudo bash install.sh
```
Access CloudPanel at `https://your-ip:8443`.

### Create Database
1. Go to **Databases** > **Add Database**.
2. Name: `classroomio`.
3. User: `classroomio_user`.
4. Password: Generate a strong password.
5. Note these credentials.

### Node.js Version
CloudPanel supports multiple Node.js versions. Ensure **Node.js 22** is installed or available. If not, you can install it via SSH:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 2. MinIO Setup (Self-Hosted S3)

We will run MinIO using Docker Compose on the same VPS.

### Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Run MinIO
Create a directory `/opt/minio` and a `docker-compose.yml` file:

```yaml
version: '3'
services:
  minio:
    image: minio/minio
    container_name: minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: "admin"
      MINIO_ROOT_PASSWORD: "supersecretpassword" # CHANGE THIS
    volumes:
      - ./data:/data
    ports:
      - "9000:9000" # API
      - "9001:9001" # Console
```

Run it:
```bash
cd /opt/minio
docker compose up -d
```

### Reverse Proxy (Optional but Recommended)
In CloudPanel, create a **Reverse Proxy** site for `s3.yourdomain.com` pointing to `127.0.0.1:9000` and `console.yourdomain.com` pointing to `127.0.0.1:9001` to enable SSL.

---

## 3. Deploy API (Back-end)

1. **Create Node.js Site** in CloudPanel:
   - Domain: `api.yourdomain.com`
   - App Type: **Node.js**
   - Port: `3002`

2. **Upload Code**:
   - Upload the content of `apps/api` (and `packages/database`, `packages/tsconfig`) or clone the repo.
   - Ideally, build locally and upload the `dist` folder + `package.json`.

3. **Install Dependencies**:
   - Run `npm install` or `pnpm install` in the site directory.

4. **Environment Variables (.env)**:
   Create a `.env` file in the API root:
   ```env
   PORT=3002
   DATABASE_URL="postgresql://classroomio_user:password@127.0.0.1:5432/classroomio"

   # MinIO / S3
   S3_ENDPOINT="https://s3.yourdomain.com" # or http://127.0.0.1:9000
   S3_REGION="us-east-1"
   S3_ACCESS_KEY="admin"
   S3_SECRET_KEY="supersecretpassword"
   S3_BUCKET="classroomio"

   # Better Auth
   BETTER_AUTH_SECRET="random-string-here"
   BETTER_AUTH_URL="https://app.yourdomain.com" # Dashboard URL
   ```

5. **Run Migrations**:
   ```bash
   npx prisma db push
   ```

6. **Start App**:
   - Script: `npm run start` or `node dist/index.js`

---

## 4. Deploy Dashboard (Front-end)

1. **Create Node.js Site** in CloudPanel:
   - Domain: `app.yourdomain.com`
   - App Type: **Node.js**
   - Port: `3000` (or `5173` depending on build)

2. **Upload Code**:
   - Upload `apps/dashboard` + `packages`.

3. **Environment Variables**:
   ```env
   DATABASE_URL="postgresql://classroomio_user:password@127.0.0.1:5432/classroomio"
   PUBLIC_SERVER_URL="https://api.yourdomain.com"
   BETTER_AUTH_URL="https://app.yourdomain.com"
   BETTER_AUTH_SECRET="random-string-here" # Must match API

   # If Self Hosted
   PUBLIC_IS_SELFHOSTED=true
   PRIVATE_APP_HOST=yourdomain.com
   PRIVATE_APP_SUBDOMAINS=app
   ```

4. **Build & Start**:
   - `npm install`
   - `npm run build`
   - `node build/index.js` (SvelteKit Node adapter)

---

## 5. Coolify Deployment

If you prefer Coolify:

1. **Add Resource** > **Project**.
2. **Database**: Add PostgreSQL.
3. **Service**: Add MinIO.
4. **Application**: Add 2 Applications (API and Dashboard) from Git.
   - **API**:
     - Build Command: `pnpm build --filter @cio/api`
     - Start Command: `pnpm start --filter @cio/api`
     - Env Vars: Same as above.
   - **Dashboard**:
     - Build Command: `pnpm build --filter @cio/dashboard`
     - Start Command: `node apps/dashboard/build/index.js`
     - Env Vars: Same as above.

## Verification

1. Visit `https://app.yourdomain.com`.
2. Sign up (Data goes to Postgres `user` table).
3. Create a Course (Data goes to `course` table).
4. Upload a file (File goes to MinIO bucket `classroomio`).

# InvenChef — Production Deployment Guide

This guide outlines how to deploy the **InvenChef** restaurant intelligence SaaS platform. The application is built as a split-stack service:
1. **Frontend**: Next.js 15 App Router (`/frontend`)
2. **Backend**: FastAPI with Python 3.11 + SQLAlchemy ORM (`/backend`)
3. **Database**: SQLite (for local development/testing) or PostgreSQL (for production)

---

## Deployment Architecture Options

Depending on your budget, team scale, and operations, choose one of these two production-ready options:

| Strategy | Host Architecture | Recommended For | Cost |
| :--- | :--- | :--- | :--- |
| **Option A (Containerized)** | **Docker Compose on Single VPS** (DigitalOcean, AWS EC2, Hetzner) | Small teams, cost-efficiency, self-hosters | \$5 - \$10/month |
| **Option B (Managed PaaS)** | **Vercel** (Frontend) + **Render/Railway** (Backend) + **Neon/Supabase** (Database) | Scaling SaaS, zero-ops, automatic CI/CD | Free tier to \$20/month |

---

## Option A: Single-Server VPS Deployment (Docker Compose)

This is the fastest way to deploy both services and a PostgreSQL database on a single Virtual Private Server (VPS).

### 1. Provision Your Server
1. Create a virtual server (Ubuntu 22.04 LTS recommended) on [DigitalOcean](https://www.digitalocean.com/), [Linode](https://www.linode.com/), [Hetzner](https://www.hetzner.com/), or [AWS EC2](https://aws.amazon.com/).
2. Set up SSH keys and log in:
   ```bash
   ssh root@your_server_ip
   ```

### 2. Install Docker & Git
Run the following on your server to install Docker, Docker Compose, and Git:
```bash
# Update packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify install
docker --version
docker compose version
```

### 3. Clone and Configure
Clone your repository to the server:
```bash
git clone https://github.com/your-username/invenchef.git /var/www/invenchef
cd /var/www/invenchef
```

Create a production-specific Docker Compose file (`docker-compose.prod.yml`):
```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: invenchef-db-prod
    environment:
      POSTGRES_USER: invenchef_prod_user
      POSTGRES_PASSWORD: secure_prod_password_here
      POSTGRES_DB: invenchef_prod_db
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U invenchef_prod_user -d invenchef_prod_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: invenchef-backend-prod
    # Run uvicorn in production mode without hot-reload
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    expose:
      - "8000"
    environment:
      - DATABASE_URL=postgresql://invenchef_prod_user:secure_prod_password_here@db:5432/invenchef_prod_db
      - JWT_SECRET=generate_a_very_long_secure_random_key_here
      - JWT_ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=60
      - REFRESH_TOKEN_EXPIRE_DAYS=7
      - OPENAI_API_KEY=your_openai_api_key_here
    depends_on:
      db:
        condition: service_healthy
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: invenchef-frontend-prod
    # Build and start Next.js in production mode
    command: sh -c "npm run build && npm run start"
    ports:
      - "3000:3000"
    environment:
      # MUST point to the public domain or server IP where the API is reached
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
    depends_on:
      - backend
    restart: always

volumes:
  postgres_prod_data:
```

### 4. Deploy the Stack
Run Docker Compose in detached mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
This builds production-optimized containers, seeds the PostgreSQL database automatically, and starts the services.

### 5. Configure Reverse Proxy & SSL (Caddy / Nginx)
To expose your app securely over HTTPS (port 443), install Caddy on the server host:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Edit `/etc/caddy/Caddyfile`:
```caddy
# Frontend Client App
invenchef.com {
    reverse_proxy localhost:3000
}

# Backend FastAPI API
api.invenchef.com {
    reverse_proxy localhost:8000
}
```
Restart Caddy (it will automatically provision SSL certificates from Let's Encrypt):
```bash
sudo systemctl restart caddy
```

---

## Option B: Managed Cloud Deployments (PaaS)

This option is highly recommended to delegate server patches, SSL provisioning, database backups, and autoscaling.

### Part 1: Host the Database (Neon or Supabase)
1. Register on [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/).
2. Create a new PostgreSQL database instance.
3. Retrieve the connection string. It will look like:
   `postgresql://[user]:[password]@[hostname]/[db_name]?sslmode=require`

### Part 2: Deploy Backend API (Render / Railway / Fly.io)
We'll use **Render** in this example:
1. Sign in to [Render.com](https://render.com/).
2. Click **New** → **Web Service**.
3. Connect your GitHub repository.
4. Set config parameters:
   - **Name**: `invenchef-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Advanced** / **Environment Variables**, add:
   - `DATABASE_URL` = (Your Neon/Supabase PostgreSQL connection string)
   - `JWT_SECRET` = (A secure random string)
   - `JWT_ALGORITHM` = `HS256`
   - `OPENAI_API_KEY` = (Your OpenAI API Key)
6. Click **Deploy Web Service**. Render provides a URL (e.g. `https://invenchef-backend.onrender.com`).

### Part 3: Deploy Frontend Next.js (Vercel)
**Vercel** is the optimal host for Next.js:
1. Log in to [Vercel.com](https://vercel.com/).
2. Click **Add New** → **Project**.
3. Connect your GitHub repository and select your project.
4. Set config parameters:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
5. In **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://invenchef-backend.onrender.com/api/v1`
     *(Note: Point this to your live Render backend URL, appending `/api/v1`)*
6. Click **Deploy**. Vercel handles compilation, routing optimization, and gives you a free `.vercel.app` domain (or binds your custom domain with automatic SSL).

---

## Database Migrations (Production Updates)

FastAPI automatically initializes database tables on first startup via:
```python
Base.metadata.create_all(bind=engine)
```
If you deploy updates that modify the database schema later, you should configure **Alembic** migrations:
1. Initialize Alembic inside the `/backend` folder:
   ```bash
   alembic init alembic
   ```
2. Configure `alembic.ini` to pull the active `DATABASE_URL` environment variable.
3. Run migrations during your CI/CD build step before start:
   ```bash
   alembic upgrade head
   ```

---

## Production Security Checklist

* [ ] **Change Default Passwords**: Ensure PostgreSQL credentials in your Compose file are not the default development credentials.
* [ ] **Secret Management**: Never hardcode `JWT_SECRET` or `OPENAI_API_KEY`. Keep them strictly in server environment variables.
* [ ] **CORS Settings**: Restrict backend allowed origins (`allow_origins` in `app/main.py`) to your specific production frontend domain instead of `*` or localhost.
* [ ] **Disable Reload**: Ensure `--reload` is removed from uvicorn start scripts to boost processing speeds and secure memory threads.
* [ ] **Backups**: Ensure your PostgreSQL database volume (`postgres_data`) or managed instance has periodic backups enabled.

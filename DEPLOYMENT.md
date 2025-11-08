# Deployment Guide for AutoPointCloud

This guide covers various deployment options for AutoPointCloud, a Rust-based point cloud processing application.

## Table of Contents
- [Quick Start (Local Development)](#quick-start-local-development)
- [Production Deployment Options](#production-deployment-options)
  - [Option 1: Fly.io (Recommended)](#option-1-flyio-recommended)
  - [Option 2: Railway](#option-2-railway)
  - [Option 3: Render](#option-3-render)
  - [Option 4: Docker](#option-4-docker)
  - [Option 5: Traditional VPS](#option-5-traditional-vps)
- [CI/CD Setup](#cicd-setup)
- [Environment Variables](#environment-variables)

## Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/sumeshthkr/autopointcloud.git
cd autopointcloud

# Build and run
cargo build --release
./target/release/autopointcloud

# Access the application
open http://127.0.0.1:8080
```

## Production Deployment Options

### Option 1: Fly.io (Recommended)

Fly.io is excellent for Rust applications and provides global deployment.

#### Prerequisites
- Install Fly.io CLI: `curl -L https://fly.io/install.sh | sh`
- Create a Fly.io account: https://fly.io/app/sign-up

#### Deployment Steps

```bash
# Login to Fly.io
flyctl auth login

# Launch the application (first time)
flyctl launch
# This will:
# - Detect the Rust application
# - Create a fly.toml configuration
# - Set up the application

# Deploy the application
flyctl deploy

# Open the application
flyctl open

# View logs
flyctl logs

# Scale the application (optional)
flyctl scale count 2
flyctl scale vm shared-cpu-1x --memory 512
```

#### Custom Domain (Optional)

```bash
# Add custom domain
flyctl certs create yourdomain.com

# Add DNS records as instructed by Fly.io
```

### Option 2: Railway

Railway provides automatic deployments from GitHub.

#### Deployment Steps

1. Visit https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository
5. Railway will automatically:
   - Detect Rust
   - Build the application
   - Deploy it

#### Configuration

Create a `railway.toml`:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "./target/release/autopointcloud"
healthcheckPath = "/api/health"
restartPolicyType = "on_failure"
```

### Option 3: Render

Render provides simple Rust deployment with automatic HTTPS.

#### Deployment Steps

1. Visit https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Environment**: Rust
   - **Build Command**: `cargo build --release`
   - **Start Command**: `./target/release/autopointcloud`
   - **Port**: 8080
5. Click "Create Web Service"

### Option 4: Docker

Deploy using Docker on any platform.

#### Build and Run Locally

```bash
# Build the Docker image
docker build -t autopointcloud:latest .

# Run the container
docker run -p 8080:8080 autopointcloud:latest

# Access the application
open http://localhost:8080
```

#### Deploy to Docker Hub

```bash
# Tag the image
docker tag autopointcloud:latest yourusername/autopointcloud:latest

# Push to Docker Hub
docker push yourusername/autopointcloud:latest
```

#### Docker Compose (with persistence)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  autopointcloud:
    image: autopointcloud:latest
    build: .
    ports:
      - "8080:8080"
    environment:
      - RUST_LOG=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Run with:
```bash
docker-compose up -d
```

### Option 5: Traditional VPS

Deploy on a VPS (DigitalOcean, Linode, AWS EC2, etc.).

#### Prerequisites
- Ubuntu 20.04+ or Debian 11+
- Rust 1.70+
- Nginx (optional, for reverse proxy)

#### Deployment Steps

```bash
# On your server:
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Clone and build
git clone https://github.com/sumeshthkr/autopointcloud.git
cd autopointcloud
cargo build --release

# 3. Create systemd service
sudo tee /etc/systemd/system/autopointcloud.service > /dev/null <<EOF
[Unit]
Description=AutoPointCloud Service
After=network.target

[Service]
Type=simple
User=autopointcloud
WorkingDirectory=/opt/autopointcloud
ExecStart=/opt/autopointcloud/target/release/autopointcloud
Restart=always
RestartSec=5
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
EOF

# 4. Enable and start service
sudo systemctl enable autopointcloud
sudo systemctl start autopointcloud
sudo systemctl status autopointcloud
```

#### Nginx Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/autopointcloud
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/autopointcloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## CI/CD Setup

### GitHub Actions

The repository includes a CI/CD pipeline in `.github/workflows/ci-cd.yml` that:
- Runs on every push and pull request
- Lints code with `cargo fmt` and `cargo clippy`
- Runs tests
- Builds the project
- Builds Docker image
- Can deploy to Fly.io (when configured)

### Enable Fly.io Auto-Deployment

1. Get your Fly.io API token:
   ```bash
   flyctl auth token
   ```

2. Add it to GitHub Secrets:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Create new secret: `FLY_API_TOKEN`
   - Paste your token

3. Uncomment the deploy-fly job in `.github/workflows/ci-cd.yml`

4. Push to main branch to trigger deployment

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RUST_LOG` | Log level (error, warn, info, debug, trace) | `info` |
| `PORT` | Port to bind to | `8080` |
| `HOST` | Host to bind to | `127.0.0.1` |

## Monitoring and Maintenance

### Health Check Endpoint

The application provides a health check endpoint:
```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "service": "autopointcloud",
  "version": "0.1.0"
}
```

### Viewing Logs

**Fly.io:**
```bash
flyctl logs
```

**Railway:**
View logs in the Railway dashboard

**Docker:**
```bash
docker logs -f container_name
```

**Systemd:**
```bash
sudo journalctl -u autopointcloud -f
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production (Fly.io, Railway, and Render provide this automatically)
2. **Environment Variables**: Never commit secrets to the repository
3. **CORS**: Configure CORS appropriately for your domain
4. **Rate Limiting**: Consider adding rate limiting for API endpoints
5. **File Upload Limits**: Configure appropriate limits for point cloud uploads

## Scaling

### Horizontal Scaling (Fly.io)

```bash
# Scale to multiple instances
flyctl scale count 3

# Scale across multiple regions
flyctl regions add ams  # Amsterdam
flyctl regions add lax  # Los Angeles
```

### Vertical Scaling

```bash
# Fly.io
flyctl scale vm shared-cpu-2x --memory 1024

# Railway/Render
Adjust in the dashboard
```

## Troubleshooting

### Build Fails

```bash
# Clear cargo cache and rebuild
cargo clean
cargo build --release
```

### Application Won't Start

1. Check logs for errors
2. Verify port 8080 is not in use
3. Ensure all dependencies are installed
4. Check file permissions

### Slow Performance

1. Ensure running in release mode (`--release`)
2. Increase memory allocation
3. Check for memory leaks
4. Consider horizontal scaling

## Support

For issues and questions:
- GitHub Issues: https://github.com/sumeshthkr/autopointcloud/issues
- Email: your.email@example.com

## License

MIT License - see LICENSE file for details

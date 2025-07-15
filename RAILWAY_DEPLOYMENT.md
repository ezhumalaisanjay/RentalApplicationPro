# Railway Deployment Guide

This guide will help you deploy your Rental Application Pro to Railway using the Railway CLI.

## Prerequisites

1. A Railway account (free tier available)
2. Railway CLI (we'll use npx)
3. Your database connection string (Neon, Supabase, etc.)
4. Your webhook URL (optional)

## Quick Deployment Steps

### 1. Login to Railway

```bash
npx @railway/cli login
```

### 2. Initialize Railway Project

```bash
npx @railway/cli init
```

This will:
- Create a new Railway project
- Link your local directory to Railway
- Generate a `.railway` directory with project configuration

### 3. Set Environment Variables

```bash
# Set all required environment variables
npx @railway/cli variables set NODE_ENV=production
npx @railway/cli variables set DATABASE_URL=postgresql://neondb_owner:npg_mFKo6JvGL5Ty@ep-jolly-frost-a8kmjxks-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require
npx @railway/cli variables set ENCRYPTION_KEY=b523ea64bcbc095cdfaeb6cb6543d6c8009e67c65123f260363ab0a11e9daaa1
npx @railway/cli variables set SESSION_SECRET=4da4ddb2743c1faa1be3cf7dbce13dbf3212bb174ddfa57e6c0b7d375be1a993
npx @railway/cli variables set WEBHOOK_URL=https://httpbin.org/post
```

### 4. Deploy to Railway

```bash
npx @railway/cli up
```

### 5. Open Your Application

```bash
npx @railway/cli open
```

## Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ Yes |
| `DATABASE_URL` | Your PostgreSQL connection string | ✅ Yes |
| `ENCRYPTION_KEY` | Your 32-character encryption key | ✅ Yes |
| `SESSION_SECRET` | Your session secret | ✅ Yes |
| `WEBHOOK_URL` | Your webhook URL (optional) | ❌ No |

## Railway CLI Commands

### Project Management
```bash
# List all projects
npx @railway/cli projects

# Switch between projects
npx @railway/cli link

# View project status
npx @railway/cli status
```

### Deployment
```bash
# Deploy latest changes
npx @railway/cli up

# Deploy specific branch
npx @railway/cli up --branch main

# View deployment logs
npx @railway/cli logs

# View real-time logs
npx @railway/cli logs --follow
```

### Environment Variables
```bash
# List all variables
npx @railway/cli variables

# Set a variable
npx @railway/cli variables set KEY=value

# Get a variable value
npx @railway/cli variables get KEY

# Delete a variable
npx @railway/cli variables unset KEY
```

### Domain Management
```bash
# List custom domains
npx @railway/cli domains

# Add custom domain
npx @railway/cli domains add yourdomain.com

# Remove custom domain
npx @railway/cli domains remove yourdomain.com
```

## Configuration Files

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

## Migration from Render

### 1. Export Environment Variables from Render
Copy your environment variables from Render dashboard to Railway.

### 2. Update DNS (if using custom domain)
- Remove custom domain from Render
- Add custom domain to Railway
- Update DNS records to point to Railway

### 3. Test the Migration
- Deploy to Railway
- Test all functionality
- Verify webhooks work
- Check database connections

## Troubleshooting

### Build Failures
```bash
# View build logs
npx @railway/cli logs --build

# Check build status
npx @railway/cli status
```

### Environment Issues
```bash
# Verify environment variables
npx @railway/cli variables

# Test database connection
npx @railway/cli logs | grep "database"
```

### Performance Issues
```bash
# Check resource usage
npx @railway/cli status

# View performance metrics
npx @railway/cli metrics
```

## Railway vs Render Comparison

| Feature | Railway | Render |
|---------|---------|--------|
| **Free Tier** | ✅ Yes | ✅ Yes |
| **Custom Domains** | ✅ Yes | ✅ Yes |
| **SSL Certificates** | ✅ Auto | ✅ Auto |
| **Environment Variables** | ✅ Yes | ✅ Yes |
| **CLI Tool** | ✅ Yes | ❌ No |
| **Database Integration** | ✅ Yes | ✅ Yes |
| **Webhook Support** | ✅ Yes | ✅ Yes |
| **File Upload Limits** | ✅ Higher | ✅ Good |

## Benefits of Railway

1. **Better CLI Experience** - Full CLI control
2. **Higher Limits** - Better for large file uploads
3. **Faster Deployments** - Optimized build process
4. **Better Logging** - Real-time log streaming
5. **Database Integration** - Built-in PostgreSQL support

## Support

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/reference/cli)
- [Railway Community](https://community.railway.app/)

## Next Steps

1. Run the deployment commands above
2. Test your application thoroughly
3. Set up custom domain (optional)
4. Configure monitoring and alerts
5. Set up CI/CD pipeline (optional) 
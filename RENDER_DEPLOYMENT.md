# Render Deployment Guide

This guide will help you deploy your Rental Application Pro to Render.

## Prerequisites

1. A Render account (free tier available)
2. Your database connection string (Neon, Supabase, or other PostgreSQL provider)
3. Your webhook URL (if using Make.com or similar)

## Deployment Steps

### 1. Connect Your Repository

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository containing this project

### 2. Configure the Web Service

**Basic Settings:**
- **Name**: `rental-application-pro` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (root of repository)

**Build & Deploy Settings:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. Environment Variables

Add these environment variables in the Render dashboard:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` | Yes |
| `PORT` | Port for the server (Render will set this automatically) | No |
| `DATABASE_URL` | Your PostgreSQL connection string | Yes |
| `ENCRYPTION_KEY` | Secret key for encrypting sensitive data | Yes |
| `WEBHOOK_URL` | URL for webhook notifications (Make.com, etc.) | No |
| `SESSION_SECRET` | Secret for session management (Render can generate) | Yes |

**Example DATABASE_URL:**
```
postgresql://username:password@host:port/database
```

**Example ENCRYPTION_KEY:**
```
your-32-character-encryption-key-here
```

### 4. Advanced Settings

**Health Check Path:** `/api/health`

**Auto-Deploy:** Enable to automatically deploy on git push

### 5. Deploy

1. Click "Create Web Service"
2. Render will start building and deploying your application
3. Monitor the build logs for any issues
4. Once deployed, you'll get a URL like: `https://your-app-name.onrender.com`

## Post-Deployment

### 1. Test Your Application

1. Visit your Render URL
2. Test the rental application form
3. Verify file uploads work
4. Check webhook notifications (if configured)

### 2. Custom Domain (Optional)

1. In your Render dashboard, go to your web service
2. Click "Settings" → "Custom Domains"
3. Add your domain and configure DNS

### 3. SSL Certificate

Render automatically provides SSL certificates for all deployments.

## Troubleshooting

### Common Issues

**Build Failures:**
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check build logs for specific errors

**Database Connection Issues:**
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from Render's IP ranges
- Check database connection limits

**File Upload Issues:**
- Verify file size limits (currently set to 100MB)
- Check that the `/api/upload-files` endpoint is working

**Webhook Issues:**
- Verify `WEBHOOK_URL` is correct and accessible
- Check webhook service logs
- Test webhook endpoint manually

### Logs and Debugging

1. In Render dashboard, go to your web service
2. Click "Logs" tab to view real-time logs
3. Use the health check endpoint: `https://your-app.onrender.com/api/health`

### Performance Optimization

**For Production:**
- Consider upgrading to a paid plan for better performance
- Enable auto-scaling if needed
- Monitor resource usage in Render dashboard

## Environment-Specific Notes

### Development vs Production

- **Development**: Uses Vite dev server with hot reload
- **Production**: Serves built static files with Express API

### File Structure

```
/
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared schemas and types
├── netlify/         # Netlify functions (legacy)
├── render.yaml      # Render configuration
└── package.json     # Main package file
```

## Migration from Netlify

If migrating from Netlify:

1. **API Endpoints**: All `/api/*` endpoints now work directly (no redirects needed)
2. **File Uploads**: Same functionality, different hosting
3. **Webhooks**: Same webhook system, just different server
4. **Environment Variables**: Transfer from Netlify to Render dashboard

## Support

For Render-specific issues:
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)

For application-specific issues:
- Check the logs in Render dashboard
- Review the application code and configuration 
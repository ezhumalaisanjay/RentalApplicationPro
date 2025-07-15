# Deployment Guide

## Netlify Deployment Configuration

### 1. Backend Server Setup

Your backend server needs to be deployed separately (e.g., on Heroku, Railway, or any other hosting service). Once deployed, you'll get a URL like:
- `https://your-app-name.herokuapp.com`
- `https://your-app-name.railway.app`
- `https://your-backend-server.com`

### 2. Frontend Configuration

#### For Development (Local)
The application will automatically use `http://localhost:5001/api` when running in development mode.

#### For Production (Netlify)
You need to set the `VITE_API_URL` environment variable in your Netlify dashboard:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add a new variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-server.com/api`

#### Example Environment Variables for Netlify:
```
VITE_API_URL=https://your-app-name.herokuapp.com/api
VITE_ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long
```

### 3. Netlify Configuration

The `netlify.toml` file is already configured to:
- Build from the `client/dist` directory
- Redirect API calls to your backend server
- Handle client-side routing

### 4. CORS Configuration

Make sure your backend server allows requests from your Netlify domain. Add this to your server configuration:

```javascript
app.use(cors({
  origin: [
    'https://your-netlify-app.netlify.app',
    'http://localhost:3000', // for local development
    'http://localhost:5000'  // for local development
  ],
  credentials: true
}));
```

### 5. Environment Variables for Backend

Set these environment variables on your backend server:
```
DATABASE_URL=your-database-connection-string
ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long
PORT=5000
```

### 6. Testing the Configuration

1. Deploy your backend server first
2. Set the `VITE_API_URL` environment variable in Netlify
3. Deploy your frontend to Netlify
4. Test the form submission to ensure it connects to your backend

### Troubleshooting

If you get 404 errors when submitting the form:
1. Check that `VITE_API_URL` is set correctly in Netlify
2. Verify your backend server is running and accessible
3. Check the browser console for the actual URL being called
4. Ensure CORS is properly configured on your backend

### Example Backend Deployment (Heroku)

```bash
# Deploy to Heroku
heroku create your-app-name
heroku config:set DATABASE_URL=your-database-url
heroku config:set ENCRYPTION_KEY=your-encryption-key
git push heroku main
``` 
#!/bin/bash

echo "🚀 Starting Railway deployment..."

# Check if logged in
if ! npx @railway/cli whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to Railway. Please run: npx @railway/cli login"
    exit 1
fi

echo "✅ Logged in to Railway"

# Force a clean deployment
echo "🔄 Forcing clean deployment..."
npx @railway/cli up --detach

echo "📊 Checking deployment status..."
npx @railway/cli status

echo "📋 Viewing logs..."
npx @railway/cli logs --follow

echo "✅ Deployment complete!" 
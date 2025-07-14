#!/bin/bash

# Setup script for environment variables
echo "Setting up environment variables for Rental Application Pro..."

# Check if .env file exists
if [ -f ".env" ]; then
    echo "Warning: .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file with default values
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://your-username:your-password@localhost:5432/rental_applications

# Encryption keys for file uploads (change these in production!)
ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long
VITE_ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long

# Server Configuration
PORT=5000

# Debug mode (optional)
DEBUG=true
EOF

echo "✅ .env file created successfully!"
echo ""
echo "⚠️  IMPORTANT: Please update the following values in .env:"
echo "   - DATABASE_URL: Your actual database connection string"
echo "   - ENCRYPTION_KEY: A strong 32-character encryption key"
echo "   - VITE_ENCRYPTION_KEY: Same encryption key as above"
echo ""
echo "For production deployment on Netlify, set these environment variables in your Netlify dashboard."
echo ""
echo "🔐 Security Note: Never commit the .env file to version control!" 
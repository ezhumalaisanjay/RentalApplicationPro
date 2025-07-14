# Rental Application System - Setup Guide

## 🚀 Quick Start

Your development server is now running successfully on port 5000! You can access the application at:
**http://localhost:5000**

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (local or cloud)

## 🔧 Complete Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory by copying `env.example`:

```bash
cp env.example .env
```

Then edit the `.env` file with your actual values:

```env
# Database Configuration
DATABASE_URL=postgresql://your-username:your-password@localhost:5432/rental_applications

# Encryption keys for file uploads (change these in production!)
ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long
VITE_ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long

# Server Configuration
PORT=5000

# Debug mode (optional)
DEBUG=true
```

### 2. Database Setup

#### Option A: Local PostgreSQL
1. Install PostgreSQL on your system
2. Create a database named `rental_applications`
3. Update the `DATABASE_URL` in your `.env` file

#### Option B: Cloud Database (Recommended)
1. Sign up for a free Neon PostgreSQL database at https://neon.tech
2. Copy the connection string to your `DATABASE_URL`

### 3. Database Migration

Run the database migration to create the required tables:

```bash
npm run db:push
```

### 4. Install Dependencies

If you haven't already, install all dependencies:

```bash
npm install
```

### 5. Start Development Server

The server is already running! If you need to restart it:

```bash
npm run dev
```

## 🎯 What's Working Now

✅ **Development Server**: Running on port 5000 with automatic port fallback  
✅ **Frontend**: React application with TypeScript and Tailwind CSS  
✅ **Backend**: Express.js server with API endpoints  
✅ **File Uploads**: Encrypted file upload system  
✅ **Database Schema**: Complete rental application schema  
✅ **Form Validation**: Zod schema validation  
✅ **PDF Generation**: Client-side PDF generation  
✅ **Digital Signatures**: Canvas-based signature capture  

## 🔍 Key Features

### Frontend Features
- **Multi-step Application Form**: Professional rental application with conditional sections
- **Co-Applicant Support**: Full co-applicant information capture
- **Guarantor Support**: Complete guarantor information and financial data
- **Document Upload**: Encrypted file uploads for required documents
- **Digital Signatures**: Canvas-based signature capture for all parties
- **PDF Generation**: Professional PDF output with Liberty Place branding
- **Responsive Design**: Works on mobile and desktop

### Backend Features
- **RESTful API**: Complete CRUD operations for rental applications
- **File Encryption**: AES encryption for secure file uploads
- **Database Integration**: PostgreSQL with Drizzle ORM
- **Form Validation**: Server-side validation with Zod schemas
- **Error Handling**: Comprehensive error handling and logging

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 📁 Project Structure

```
RentalApplicationPro/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
├── server/                # Express.js backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database operations
├── shared/               # Shared code
│   └── schema.ts         # Database schema
├── uploads/              # File uploads directory
└── netlify/              # Netlify deployment config
```

## 🔐 Security Features

- **File Encryption**: All uploaded files are encrypted using AES
- **Environment Variables**: Sensitive data stored in environment variables
- **Input Validation**: Comprehensive validation on both frontend and backend
- **Secure File Handling**: Unique filenames and proper file type validation

## 🚀 Deployment

### Netlify Deployment
The project is configured for Netlify deployment with:
- Serverless functions for API endpoints
- Static file serving
- Environment variable configuration

### Production Considerations
1. Change encryption keys in production
2. Use a production database
3. Configure proper CORS settings
4. Set up SSL certificates
5. Configure proper file upload limits

## 🐛 Troubleshooting

### Port Already in Use
The server now automatically tries the next available port if 5000 is busy.

### Database Connection Issues
1. Check your `DATABASE_URL` in the `.env` file
2. Ensure your database is running
3. Verify network connectivity for cloud databases

### File Upload Issues
1. Check that the `uploads/` directory exists
2. Verify encryption keys are set correctly
3. Check file size limits (10MB per file)

### Build Issues
1. Run `npm install` to ensure all dependencies are installed
2. Check TypeScript errors with `npm run check`
3. Clear node_modules and reinstall if needed

## 📞 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure the database is accessible
4. Check the browser's developer tools for frontend errors

## 🎉 You're All Set!

Your rental application system is now properly configured and running. You can:
- Access the application at http://localhost:5000
- Start creating rental applications
- Upload documents securely
- Generate professional PDFs
- Manage applications through the API

Happy coding! 🚀 
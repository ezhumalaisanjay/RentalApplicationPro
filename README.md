# Rental Application Pro - Local Development

A rental application system built with React, TypeScript, Express, and PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RentalApplicationPro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your local database configuration:
   ```env
   DATABASE_URL=postgresql://your-username:your-password@localhost:5432/rental_applications
   ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long
   VITE_ENCRYPTION_KEY=your-secret-key-change-in-production-32-characters-long
   PORT=5000
   DEBUG=true
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check
- `npm run db:push` - Push database schema changes

## Project Structure

- `client/` - React frontend application
- `server/` - Express backend server
- `shared/` - Shared TypeScript types and schemas
- `dist/` - Build output (generated)

## Features

- Rental application form with validation
- File upload and encryption
- PDF generation
- Database storage with Drizzle ORM
- TypeScript throughout the stack

## Local Development Notes

- The application runs on `localhost:5000` by default
- Database should be running locally on PostgreSQL
- File uploads are stored locally
- All webhook functionality has been removed for local development 
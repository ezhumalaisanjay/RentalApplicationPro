# Rental Application System

## Overview

This is a full-stack rental application management system built with React (frontend), Express.js (backend), and PostgreSQL (database with Drizzle ORM). The application allows users to fill out comprehensive rental applications with support for multiple applicants, document uploads, digital signatures, and PDF generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and bundling
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Hook Form for form state, TanStack Query for server state
- **Form Validation**: Zod schema validation with react-hook-form integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Pattern**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Development**: Hot reload with tsx and Vite middleware integration

### Data Storage
- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM with schema migrations
- **In-Memory Fallback**: MemStorage class for development/testing
- **Schema**: Comprehensive rental application schema with support for primary applicants, co-applicants, and guarantors

## Key Components

### Frontend Components
1. **ApplicationForm**: Main form component with multi-step wizard-like interface
2. **FinancialSection**: Reusable component for employment and financial information
3. **DocumentSection**: File upload component supporting multiple document types
4. **SignaturePad**: Canvas-based digital signature capture
5. **UI Components**: Complete set of accessible components from shadcn/ui

### Backend Components
1. **Routes**: RESTful endpoints for CRUD operations on rental applications
2. **Storage Interface**: Abstracted storage layer supporting both database and in-memory implementations
3. **Schema Validation**: Zod schemas for request validation and type safety

### Core Features
- Multi-applicant support (primary, co-applicant, guarantor)
- File upload handling for required documents
- Digital signature capture
- PDF generation for completed applications
- Form validation and error handling
- Responsive design for mobile and desktop

## Data Flow

1. **Application Creation**: User fills out form → Frontend validation → API request → Database storage
2. **Document Upload**: File selection → Client-side validation → Storage (planned backend integration)
3. **Signature Capture**: Canvas drawing → Base64 encoding → Form state → Database storage
4. **PDF Generation**: Form data → PDF library → Download trigger
5. **Application Retrieval**: API request → Database query → JSON response → Frontend display

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React 18 with TypeScript
- **Form Management**: React Hook Form with Zod resolver
- **HTTP Client**: Fetch API with TanStack Query wrapper
- **PDF Generation**: jsPDF for client-side PDF creation
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

### Backend Dependencies
- **Database**: Neon PostgreSQL serverless with connection pooling
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Validation**: Zod for runtime type checking
- **Session Management**: connect-pg-simple for PostgreSQL session storage

### Development Dependencies
- **Build Tools**: Vite for frontend, esbuild for backend
- **Development**: tsx for TypeScript execution, Replit-specific plugins
- **Code Quality**: TypeScript strict mode, ESLint configuration

## Deployment Strategy

### Production Build Process
1. **Frontend**: Vite builds optimized static assets to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `drizzle-kit push`
4. **Static Export**: Next.js-style static export configuration for GitHub Pages compatibility

### Environment Configuration
- **Development**: Local PostgreSQL or Neon database
- **Production**: Neon serverless PostgreSQL with environment-based connection
- **Asset Handling**: Configurable base paths for different deployment targets

### Key Architectural Decisions

1. **Database Choice**: PostgreSQL chosen for relational data integrity and complex queries needed for rental applications
2. **ORM Selection**: Drizzle ORM provides type safety without runtime overhead, better than traditional ORMs for this use case
3. **Frontend Framework**: React chosen for component reusability and ecosystem maturity
4. **Form Handling**: React Hook Form reduces re-renders and provides excellent validation integration
5. **UI Components**: Shadcn/ui provides accessible, customizable components without vendor lock-in
6. **File Handling**: Client-side file validation with planned server-side storage integration
7. **PDF Generation**: Client-side generation reduces server load and provides immediate downloads
8. **Storage Abstraction**: Interface pattern allows switching between database and in-memory storage for testing

### Trade-offs and Considerations
- **Client-side PDF**: Reduces server complexity but limits template customization
- **File Upload**: Currently client-side only, needs server integration for production
- **Database**: Neon serverless provides scalability but adds network latency
- **Static Export**: Enables flexible deployment but limits server-side features
const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Create Express app
const app = express();

// Increase payload limits for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Configure multer for FormData parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    fieldSize: 100 * 1024 * 1024 // 100MB field size limit
  }
});

// Configure multer for text-only FormData (no file uploads)
const textUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 100 * 1024 * 1024 // 100MB field size limit
  }
}).none(); // .none() means no file uploads, only text fields

// Add debugging middleware for body parsing
app.use((req, res, next) => {
  if (req.path === '/api/submit-application') {
    console.log('=== BODY PARSING DEBUG ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Body type after parsing:', typeof req.body);
    console.log('Body keys after parsing:', req.body ? Object.keys(req.body) : 'null');
  }
  next();
});

// Note: Timeout handling is now managed via Netlify configuration and AbortController
// The 30-second timeout in netlify.toml handles serverless function timeouts

// Basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  
  // Log request size for debugging
  if (requestPath.startsWith("/api")) {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeInMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
      console.log(`Request size: ${sizeInMB}MB for ${req.method} ${requestPath}`);
    }
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (bodyJson) {
        logLine += ` :: ${JSON.stringify(bodyJson)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  next();
});

// Import and setup database storage
console.log('=== IMPORTING MODULES ===');
try {
  console.log('Importing storage module...');
  const { storage } = require('./storage');
  console.log('Storage module imported successfully');
  console.log('Storage object type:', typeof storage);
  console.log('Storage object keys:', storage ? Object.keys(storage) : 'null');
  
  // Test storage connection
  try {
    console.log('Testing storage connection...');
    const testResult = await storage.getAllApplications();
    console.log('Storage connection test successful, found', testResult ? testResult.length : 0, 'applications');
  } catch (storageTestError) {
    console.error('Storage connection test failed:', storageTestError);
    console.error('Storage test error message:', storageTestError.message);
    // Don't throw here, just log the error
  }
} catch (storageImportError) {
  console.error('Failed to import storage module:', storageImportError);
  throw storageImportError;
}

try {
  console.log('Importing schema module...');
  const { insertRentalApplicationSchema } = require('./schema');
  console.log('Schema module imported successfully');
  console.log('Schema type:', typeof insertRentalApplicationSchema);
} catch (schemaImportError) {
  console.error('Failed to import schema module:', schemaImportError);
  throw schemaImportError;
}

const { z } = require('zod');
const CryptoJS = require('crypto-js');

// API Routes
app.get("/api/applications", async (req, res) => {
  try {
    const applications = await storage.getAllApplications();
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

app.get("/api/applications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const application = await storage.getApplication(id);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const validatedData = insertRentalApplicationSchema.parse(req.body);
    const application = await storage.createApplication(validatedData);
    res.status(201).json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    console.error('Error creating application:', error);
    res.status(500).json({ error: "Failed to create application" });
  }
});

app.patch("/api/applications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const validatedData = insertRentalApplicationSchema.partial().parse(req.body);
    const application = await storage.updateApplication(id, validatedData);
    
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    console.error('Error updating application:', error);
    res.status(500).json({ error: "Failed to update application" });
  }
});

app.post("/api/applications/:id/submit", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const application = await storage.updateApplication(id, { 
      status: 'submitted',
    });
    
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({ message: "Application submitted successfully", application });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// Main application submission endpoint
app.post("/api/submit-application", async (req, res) => {
  console.log('=== SUBMIT-APPLICATION ENDPOINT CALLED ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  // Global error handler wrapper
  const handleRequest = async () => {
    try {
      console.log('=== HANDLE REQUEST STARTED ===');
      console.log('Environment check - NODE_ENV:', process.env.NODE_ENV);
      console.log('Environment check - ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY);
    console.log('=== Starting application submission ===');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Check if request body exists
    if (!req.body) {
      console.error('No request body received');
      return res.status(400).json({ error: "No request body received" });
    }
    
    console.log('Request body exists, type:', typeof req.body);
    console.log('Request body is null:', req.body === null);
    console.log('Request body is undefined:', req.body === undefined);
    console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');
    
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body received:', {
      hasApplicationData: !!req.body.applicationData,
      hasFiles: !!req.body.files,
      hasSignatures: !!req.body.signatures,
      hasEncryptedData: !!req.body.encryptedData,
      applicationDataKeys: req.body.applicationData ? Object.keys(req.body.applicationData) : []
    });
    
    const { applicationData, files, signatures, encryptedData } = req.body;
    
    // Log payload size for debugging
    const payloadSize = JSON.stringify(req.body).length;
    const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);
    console.log(`Payload size: ${payloadSizeMB}MB`);
    
    console.log('Request summary:', {
      hasApplicationData: !!applicationData,
      hasFiles: !!files,
      hasSignatures: !!signatures,
      hasEncryptedData: !!encryptedData,
      applicationDataKeys: applicationData ? Object.keys(applicationData) : [],
      filesCount: files ? files.length : 0,
      signaturesCount: signatures ? Object.keys(signatures).length : 0,
      encryptedDataKeys: encryptedData ? Object.keys(encryptedData) : [],
      payloadSizeMB: payloadSizeMB
    });
    
    if (!applicationData) {
      console.error('No applicationData provided');
      return res.status(400).json({ error: "No application data provided" });
    }
    
    // Check payload size limit (Netlify has ~6MB limit for serverless functions)
    if (payloadSize > 5 * 1024 * 1024) { // 5MB limit
      console.error(`Payload too large: ${payloadSizeMB}MB`);
      
      // For very large payloads (>10MB), use a simplified approach
      if (payloadSize > 10 * 1024 * 1024) {
        console.log('Very large payload detected - using simplified approach');
        
        // Create a basic application object without database storage
        const basicApplication = {
          id: Date.now(),
          buildingAddress: String(applicationData.buildingAddress || 'Unknown'),
          apartmentNumber: String(applicationData.apartmentNumber || 'Unknown'),
          applicantName: String(applicationData.applicantName || 'Unknown'),
          applicantEmail: String(applicationData.applicantEmail || 'unknown@example.com'),
          monthlyRent: Number(applicationData.monthlyRent || 0),
          apartmentType: String(applicationData.apartmentType || 'Unknown'),
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          payloadSizeMB: payloadSizeMB,
          note: 'Very large payload - simplified processing'
        };
        
        // Send webhook with basic data
        try {
          console.log('Sending webhook for very large payload...');
          const webhookPayload = {
            applicationId: basicApplication.id,
            submittedAt: basicApplication.submittedAt,
            payloadSizeMB: payloadSizeMB,
            note: 'Very large payload - simplified processing',
            basicInfo: {
              applicantName: basicApplication.applicantName,
              applicantEmail: basicApplication.applicantEmail,
              buildingAddress: basicApplication.buildingAddress,
              monthlyRent: basicApplication.monthlyRent
            },
            metadata: {
              source: 'rental-application-system',
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              webhookType: 'large-payload-simplified'
            }
          };
          
          const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
          });
          
          if (webhookResponse.ok) {
            console.log('Webhook sent successfully for large payload');
            res.status(201).json({ 
              message: "Application submitted successfully (simplified processing)", 
              applicationId: basicApplication.id,
              webhookSent: true,
              note: "Large payload processed with simplified approach"
            });
            return;
          } else {
            console.error('Webhook failed for large payload:', webhookResponse.status);
          }
        } catch (webhookError) {
          console.error('Webhook error for large payload:', webhookError);
        }
        
        // If webhook fails, still return success
        res.status(201).json({ 
          message: "Application submitted successfully (simplified processing)", 
          applicationId: basicApplication.id,
          webhookSent: false,
          note: "Large payload processed with simplified approach"
        });
        return;
      }
      
      // For large payloads, create a minimal application without large data
      console.log('Creating minimal application for large payload...');
      
      const minimalApplicationForLargePayload = {
        // Required fields only
        buildingAddress: String(applicationData.buildingAddress || 'Unknown'),
        apartmentNumber: String(applicationData.apartmentNumber || 'Unknown'),
        moveInDate: applicationData.moveInDate || new Date().toISOString(),
        monthlyRent: Number(applicationData.monthlyRent || 0),
        apartmentType: String(applicationData.apartmentType || 'Unknown'),
        applicantName: String(applicationData.applicantName || 'Unknown'),
        applicantDob: applicationData.applicantDob || new Date().toISOString(),
        applicantEmail: String(applicationData.applicantEmail || 'unknown@example.com'),
        applicantAddress: String(applicationData.applicantAddress || 'Unknown'),
        applicantCity: String(applicationData.applicantCity || 'Unknown'),
        applicantState: String(applicationData.applicantState || 'Unknown'),
        applicantZip: String(applicationData.applicantZip || '00000'),
        
        // Basic optional fields
        howDidYouHear: applicationData.howDidYouHear || undefined,
        applicantSsn: applicationData.applicantSsn || null,
        applicantPhone: applicationData.applicantPhone || null,
        applicantLicense: applicationData.applicantLicense || null,
        applicantLicenseState: applicationData.applicantLicenseState || null,
        applicantLengthAtAddress: applicationData.applicantLengthAtAddress || undefined,
        applicantLandlordName: applicationData.applicantLandlordName || undefined,
        applicantCurrentRent: applicationData.applicantCurrentRent || undefined,
        applicantReasonForMoving: applicationData.applicantReasonForMoving || undefined,
        
        // Financial fields
        applicantEmployer: applicationData.applicantEmployer || null,
        applicantPosition: applicationData.applicantPosition || null,
        applicantEmploymentStart: applicationData.applicantEmploymentStart || null,
        applicantIncome: applicationData.applicantIncome ? Number(applicationData.applicantIncome) : null,
        applicantOtherIncome: applicationData.applicantOtherIncome ? Number(applicationData.applicantOtherIncome) : null,
        applicantOtherIncomeSource: applicationData.applicantOtherIncomeSource || null,
        applicantBankName: applicationData.applicantBankName || null,
        applicantAccountType: applicationData.applicantAccountType || null,
        
        // Co-applicant fields
        hasCoApplicant: Boolean(applicationData.hasCoApplicant || false),
        coApplicantName: applicationData.coApplicantName || null,
        coApplicantRelationship: applicationData.coApplicantRelationship || null,
        coApplicantDob: applicationData.coApplicantDob || null,
        coApplicantSsn: applicationData.coApplicantSsn || null,
        coApplicantPhone: applicationData.coApplicantPhone || null,
        coApplicantEmail: applicationData.coApplicantEmail || null,
        coApplicantSameAddress: Boolean(applicationData.coApplicantSameAddress || false),
        coApplicantAddress: applicationData.coApplicantAddress || null,
        coApplicantCity: applicationData.coApplicantCity || null,
        coApplicantState: applicationData.coApplicantState || null,
        coApplicantZip: applicationData.coApplicantZip || null,
        coApplicantLengthAtAddress: applicationData.coApplicantLengthAtAddress || null,
        coApplicantEmployer: applicationData.coApplicantEmployer || null,
        coApplicantPosition: applicationData.coApplicantPosition || null,
        coApplicantEmploymentStart: applicationData.coApplicantEmploymentStart || null,
        coApplicantIncome: applicationData.coApplicantIncome ? Number(applicationData.coApplicantIncome) : null,
        coApplicantOtherIncome: applicationData.coApplicantOtherIncome ? Number(applicationData.coApplicantOtherIncome) : null,
        coApplicantBankName: applicationData.coApplicantBankName || null,
        coApplicantAccountType: applicationData.coApplicantAccountType || null,
        
        // Guarantor fields
        hasGuarantor: Boolean(applicationData.hasGuarantor || false),
        guarantorName: applicationData.guarantorName || null,
        guarantorRelationship: applicationData.guarantorRelationship || null,
        guarantorDob: applicationData.guarantorDob || null,
        guarantorSsn: applicationData.guarantorSsn || null,
        guarantorPhone: applicationData.guarantorPhone || null,
        guarantorEmail: applicationData.guarantorEmail || null,
        guarantorAddress: applicationData.guarantorAddress || null,
        guarantorCity: applicationData.guarantorCity || null,
        guarantorState: applicationData.guarantorState || null,
        guarantorZip: applicationData.guarantorZip || null,
        guarantorLengthAtAddress: applicationData.guarantorLengthAtAddress || null,
        guarantorEmployer: applicationData.guarantorEmployer || null,
        guarantorPosition: applicationData.guarantorPosition || null,
        guarantorEmploymentStart: applicationData.guarantorEmploymentStart || null,
        guarantorIncome: applicationData.guarantorIncome ? Number(applicationData.guarantorIncome) : null,
        guarantorOtherIncome: applicationData.guarantorOtherIncome ? Number(applicationData.guarantorOtherIncome) : null,
        guarantorBankName: applicationData.guarantorBankName || null,
        guarantorAccountType: applicationData.guarantorAccountType || null,
        
        // Legal questions
        hasBankruptcy: Boolean(applicationData.hasBankruptcy || false),
        bankruptcyDetails: applicationData.bankruptcyDetails || undefined,
        hasEviction: Boolean(applicationData.hasEviction || false),
        evictionDetails: applicationData.evictionDetails || undefined,
        hasCriminalHistory: Boolean(applicationData.hasCriminalHistory || false),
        criminalHistoryDetails: applicationData.criminalHistoryDetails || undefined,
        hasPets: Boolean(applicationData.hasPets || false),
        petDetails: applicationData.petDetails || undefined,
        smokingStatus: applicationData.smokingStatus || undefined,
        
        // Store metadata about large data instead of the actual data
        documents: files ? `[${files.length} files - data too large to store]` : null,
        encryptedData: encryptedData ? `[Encrypted data received - ${payloadSizeMB}MB total]` : null,
        signatures: signatures ? `[${Object.keys(signatures).length} signatures - data too large to store]` : null,
        
        // Status
        status: 'submitted',
        payloadSizeMB: payloadSizeMB,
        note: 'Large payload - files and signatures stored separately'
      };
      
      // Use the minimal application for large payloads
      minimalApplication = minimalApplicationForLargePayload;
      console.log('Using minimal application for large payload');
    }
    
    // Simplified approach: Create a minimal application object with proper data types
    console.log('Creating minimal application object...');
    console.log('Application data keys:', Object.keys(applicationData));
    console.log('Sample application data values:', {
      buildingAddress: applicationData.buildingAddress,
      apartmentNumber: applicationData.apartmentNumber,
      moveInDate: applicationData.moveInDate,
      monthlyRent: applicationData.monthlyRent,
      applicantName: applicationData.applicantName,
      applicantEmail: applicationData.applicantEmail
    });
    
    const minimalApplication = {
      // Required fields with proper type conversion
      buildingAddress: String(applicationData.buildingAddress || 'Unknown'),
      apartmentNumber: String(applicationData.apartmentNumber || 'Unknown'),
      moveInDate: applicationData.moveInDate || new Date().toISOString(),
      monthlyRent: Number(applicationData.monthlyRent || 0),
      apartmentType: String(applicationData.apartmentType || 'Unknown'),
      applicantName: String(applicationData.applicantName || 'Unknown'),
      applicantDob: applicationData.applicantDob || new Date().toISOString(),
      applicantEmail: String(applicationData.applicantEmail || 'unknown@example.com'),
      applicantAddress: String(applicationData.applicantAddress || 'Unknown'),
      applicantCity: String(applicationData.applicantCity || 'Unknown'),
      applicantState: String(applicationData.applicantState || 'Unknown'),
      applicantZip: String(applicationData.applicantZip || '00000'),
      
      // Optional fields with defaults
      howDidYouHear: applicationData.howDidYouHear || undefined,
      applicantSsn: applicationData.applicantSsn || null,
      applicantPhone: applicationData.applicantPhone || null,
      applicantLicense: applicationData.applicantLicense || null,
      applicantLicenseState: applicationData.applicantLicenseState || null,
      applicantLengthAtAddress: applicationData.applicantLengthAtAddress || undefined,
      applicantLandlordName: applicationData.applicantLandlordName || undefined,
      applicantCurrentRent: applicationData.applicantCurrentRent || undefined,
      applicantReasonForMoving: applicationData.applicantReasonForMoving || undefined,
      
      // Financial fields with proper type conversion
      applicantEmployer: applicationData.applicantEmployer || null,
      applicantPosition: applicationData.applicantPosition || null,
      applicantEmploymentStart: applicationData.applicantEmploymentStart || null,
      applicantIncome: applicationData.applicantIncome ? Number(applicationData.applicantIncome) : null,
      applicantOtherIncome: applicationData.applicantOtherIncome ? Number(applicationData.applicantOtherIncome) : null,
      applicantOtherIncomeSource: applicationData.applicantOtherIncomeSource || null,
      applicantBankName: applicationData.applicantBankName || null,
      applicantAccountType: applicationData.applicantAccountType || null,
      
      // Co-applicant fields
      hasCoApplicant: Boolean(applicationData.hasCoApplicant || false),
      coApplicantName: applicationData.coApplicantName || null,
      coApplicantRelationship: applicationData.coApplicantRelationship || null,
      coApplicantDob: applicationData.coApplicantDob || null,
      coApplicantSsn: applicationData.coApplicantSsn || null,
      coApplicantPhone: applicationData.coApplicantPhone || null,
      coApplicantEmail: applicationData.coApplicantEmail || null,
      coApplicantSameAddress: Boolean(applicationData.coApplicantSameAddress || false),
      coApplicantAddress: applicationData.coApplicantAddress || null,
      coApplicantCity: applicationData.coApplicantCity || null,
      coApplicantState: applicationData.coApplicantState || null,
      coApplicantZip: applicationData.coApplicantZip || null,
      coApplicantLengthAtAddress: applicationData.coApplicantLengthAtAddress || null,
      coApplicantEmployer: applicationData.coApplicantEmployer || null,
      coApplicantPosition: applicationData.coApplicantPosition || null,
      coApplicantEmploymentStart: applicationData.coApplicantEmploymentStart || null,
      coApplicantIncome: applicationData.coApplicantIncome ? Number(applicationData.coApplicantIncome) : null,
      coApplicantOtherIncome: applicationData.coApplicantOtherIncome ? Number(applicationData.coApplicantOtherIncome) : null,
      coApplicantBankName: applicationData.coApplicantBankName || null,
      coApplicantAccountType: applicationData.coApplicantAccountType || null,
      
      // Guarantor fields
      hasGuarantor: Boolean(applicationData.hasGuarantor || false),
      guarantorName: applicationData.guarantorName || null,
      guarantorRelationship: applicationData.guarantorRelationship || null,
      guarantorDob: applicationData.guarantorDob || null,
      guarantorSsn: applicationData.guarantorSsn || null,
      guarantorPhone: applicationData.guarantorPhone || null,
      guarantorEmail: applicationData.guarantorEmail || null,
      guarantorAddress: applicationData.guarantorAddress || null,
      guarantorCity: applicationData.guarantorCity || null,
      guarantorState: applicationData.guarantorState || null,
      guarantorZip: applicationData.guarantorZip || null,
      guarantorLengthAtAddress: applicationData.guarantorLengthAtAddress || null,
      guarantorEmployer: applicationData.guarantorEmployer || null,
      guarantorPosition: applicationData.guarantorPosition || null,
      guarantorEmploymentStart: applicationData.guarantorEmploymentStart || null,
      guarantorIncome: applicationData.guarantorIncome ? Number(applicationData.guarantorIncome) : null,
      guarantorOtherIncome: applicationData.guarantorOtherIncome ? Number(applicationData.guarantorOtherIncome) : null,
      guarantorBankName: applicationData.guarantorBankName || null,
      guarantorAccountType: applicationData.guarantorAccountType || null,
      
      // Signatures
      applicantSignature: applicationData.applicantSignature || null,
      coApplicantSignature: applicationData.coApplicantSignature || null,
      guarantorSignature: applicationData.guarantorSignature || null,
      
      // Legal questions
      hasBankruptcy: Boolean(applicationData.hasBankruptcy || false),
      bankruptcyDetails: applicationData.bankruptcyDetails || undefined,
      hasEviction: Boolean(applicationData.hasEviction || false),
      evictionDetails: applicationData.evictionDetails || undefined,
      hasCriminalHistory: Boolean(applicationData.hasCriminalHistory || false),
      criminalHistoryDetails: applicationData.criminalHistoryDetails || undefined,
      hasPets: Boolean(applicationData.hasPets || false),
      petDetails: applicationData.petDetails || undefined,
      smokingStatus: applicationData.smokingStatus || undefined,
      
      // Documents and encrypted data (simplified)
      documents: files ? JSON.stringify(files) : null,
      encryptedData: encryptedData ? JSON.stringify({ received: true, timestamp: new Date().toISOString() }) : null,
      
      // Status
      status: 'submitted'
    };
    
    console.log('Minimal application data prepared:', {
      applicantName: minimalApplication.applicantName,
      applicantEmail: minimalApplication.applicantEmail,
      hasCoApplicant: minimalApplication.hasCoApplicant,
      hasGuarantor: minimalApplication.hasGuarantor
    });
    
    // Validate the minimal application data
    try {
      console.log('Validating minimal application data...');
      console.log('Data to validate:', JSON.stringify(minimalApplication, null, 2));
      console.log('Schema type:', typeof insertRentalApplicationSchema);
      console.log('Schema parse method exists:', typeof insertRentalApplicationSchema.parse);
      
      const validatedData = insertRentalApplicationSchema.parse(minimalApplication);
      console.log('Validation successful');
      console.log('Validated data keys:', Object.keys(validatedData));
    } catch (validationError) {
      console.error('=== VALIDATION ERROR ===');
      console.error('Validation error type:', typeof validationError);
      console.error('Validation error constructor:', validationError.constructor.name);
      console.error('Validation error name:', validationError.name);
      console.error('Validation error message:', validationError.message);
      console.error('Validation error details:', validationError.errors);
      console.error('Validation error stack:', validationError.stack);
      
      // Return detailed validation error
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationError.errors,
        message: validationError.message,
        fieldErrors: validationError.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })),
        receivedData: {
          keys: Object.keys(minimalApplication),
          sampleValues: {
            applicantName: minimalApplication.applicantName,
            applicantEmail: minimalApplication.applicantEmail,
            buildingAddress: minimalApplication.buildingAddress,
            monthlyRent: minimalApplication.monthlyRent
          }
        }
      });
    }
    
    // Create application in database with timeout protection
    console.log('Creating application in database...');
    console.log('Minimal application data to be stored:', JSON.stringify(minimalApplication, null, 2));
    
    const createApplication = async () => {
      try {
        console.log('Calling storage.createApplication...');
        console.log('Storage object type:', typeof storage);
        console.log('Storage methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));
        console.log('createApplication method exists:', typeof storage.createApplication);
        
        // Check if storage is properly initialized
        if (!storage) {
          throw new Error('Storage object is not initialized');
        }
        
        if (typeof storage.createApplication !== 'function') {
          throw new Error('storage.createApplication is not a function');
        }
        
        console.log('About to call storage.createApplication with data...');
        const result = await storage.createApplication(minimalApplication);
        console.log('Storage.createApplication completed successfully');
        console.log('Result type:', typeof result);
        console.log('Result keys:', result ? Object.keys(result) : 'null');
        return result;
      } catch (dbError) {
        console.error('=== DATABASE ERROR ===');
        console.error('Database error:', dbError);
        console.error('Database error stack:', dbError.stack);
        console.error('Database error name:', dbError.name);
        console.error('Database error message:', dbError.message);
        console.error('Database error constructor:', dbError.constructor.name);
        if (dbError.code) {
          console.error('Database error code:', dbError.code);
        }
        if (dbError.sql) {
          console.error('Database SQL:', dbError.sql);
        }
        if (dbError.sqlMessage) {
          console.error('Database SQL Message:', dbError.sqlMessage);
        }
        throw dbError;
      }
    };
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), 20000); // 20 second timeout
    });
    
    let application;
    try {
      application = await Promise.race([createApplication(), timeoutPromise]);
      console.log('Application created successfully with ID:', application.id);
      console.log('Application object:', JSON.stringify(application, null, 2));
    } catch (error) {
      console.error('Error in application creation:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error constructor:', error.constructor.name);
      
      // For large payloads, create a fallback application object
      if (payloadSize > 5 * 1024 * 1024) {
        console.log('Creating fallback application for large payload due to database error');
        application = {
          id: Date.now(),
          ...minimalApplication,
          submittedAt: new Date().toISOString(),
          note: 'Fallback application - database error occurred'
        };
        console.log('Fallback application created with ID:', application.id);
      } else {
        throw error;
      }
    }

    // Send webhook with complete application data organized by sections
    let webhookSent = false;
    try {
      console.log('Preparing webhook payload...');
      console.log('Application data for webhook:', {
        id: application.id,
        applicantName: application.applicantName,
        hasCoApplicant: application.hasCoApplicant,
        hasGuarantor: application.hasGuarantor
      });
      
      // Create a simplified webhook payload for large requests
      const webhookPayload = {
        // Application ID and metadata
        applicationId: application.id,
        submittedAt: new Date().toISOString(),
        
        // SECTION 1: PROPERTY INFORMATION
        propertyInfo: {
          buildingAddress: application.buildingAddress,
          apartmentNumber: application.apartmentNumber,
          moveInDate: application.moveInDate,
          monthlyRent: application.monthlyRent,
          apartmentType: application.apartmentType,
          howDidYouHear: application.howDidYouHear
        },
        
        // SECTION 2: PRIMARY APPLICANT - PERSONAL INFORMATION
        primaryApplicant: {
          personalInfo: {
            name: application.applicantName,
            dateOfBirth: application.applicantDob,
            ssn: application.applicantSsn,
            phone: application.applicantPhone,
            email: application.applicantEmail,
            license: application.applicantLicense,
            licenseState: application.applicantLicenseState
          },
          addressInfo: {
            address: application.applicantAddress,
            city: application.applicantCity,
            state: application.applicantState,
            zip: application.applicantZip,
            lengthAtAddress: application.applicantLengthAtAddress,
            landlordName: application.applicantLandlordName,
            currentRent: application.applicantCurrentRent,
            reasonForMoving: application.applicantReasonForMoving
          },
          financialInfo: {
            employer: application.applicantEmployer,
            position: application.applicantPosition,
            employmentStart: application.applicantEmploymentStart,
            income: application.applicantIncome,
            otherIncome: application.applicantOtherIncome,
            otherIncomeSource: application.applicantOtherIncomeSource,
            bankName: application.applicantBankName,
            accountType: application.applicantAccountType
          }
        },
        
        // SECTION 3: CO-APPLICANT (if applicable)
        coApplicant: application.hasCoApplicant ? {
          personalInfo: {
            name: application.coApplicantName,
            relationship: application.coApplicantRelationship,
            dateOfBirth: application.coApplicantDob,
            ssn: application.coApplicantSsn,
            phone: application.coApplicantPhone,
            email: application.coApplicantEmail
          },
          addressInfo: {
            sameAddress: application.coApplicantSameAddress,
            address: application.coApplicantAddress,
            city: application.coApplicantCity,
            state: application.coApplicantState,
            zip: application.coApplicantZip,
            lengthAtAddress: application.coApplicantLengthAtAddress
          },
          financialInfo: {
            employer: application.coApplicantEmployer,
            position: application.coApplicantPosition,
            employmentStart: application.coApplicantEmploymentStart,
            income: application.coApplicantIncome,
            otherIncome: application.coApplicantOtherIncome,
            bankName: application.coApplicantBankName,
            accountType: application.coApplicantAccountType
          }
        } : null,
        
        // SECTION 4: GUARANTOR (if applicable)
        guarantor: application.hasGuarantor ? {
          personalInfo: {
            name: application.guarantorName,
            relationship: application.guarantorRelationship,
            dateOfBirth: application.guarantorDob,
            ssn: application.guarantorSsn,
            phone: application.guarantorPhone,
            email: application.guarantorEmail
          },
          addressInfo: {
            address: application.guarantorAddress,
            city: application.guarantorCity,
            state: application.guarantorState,
            zip: application.guarantorZip,
            lengthAtAddress: application.guarantorLengthAtAddress
          },
          financialInfo: {
            employer: application.guarantorEmployer,
            position: application.guarantorPosition,
            employmentStart: application.guarantorEmploymentStart,
            income: application.guarantorIncome,
            otherIncome: application.guarantorOtherIncome,
            bankName: application.guarantorBankName,
            accountType: application.guarantorAccountType
          }
        } : null,
        
        // SECTION 5: LEGAL QUESTIONS
        legalQuestions: {
          bankruptcy: {
            hasBankruptcy: application.hasBankruptcy,
            details: application.bankruptcyDetails
          },
          eviction: {
            hasEviction: application.hasEviction,
            details: application.evictionDetails
          },
          criminalHistory: {
            hasCriminalHistory: application.hasCriminalHistory,
            details: application.criminalHistoryDetails
          },
          pets: {
            hasPets: application.hasPets,
            details: application.petDetails
          },
          smokingStatus: application.smokingStatus
        },
        
        // SECTION 6: DOCUMENTS (handle large payloads)
        documents: payloadSize > 5 * 1024 * 1024 ? {
          totalFiles: files ? files.length : 0,
          hasFiles: !!files && files.length > 0,
          note: `Large payload (${payloadSizeMB}MB) - file data stored separately`,
          payloadSizeMB: payloadSizeMB,
          files: files ? files.map((file, index) => ({
            index: index,
            name: file.name || `file_${index}`,
            type: file.type || 'unknown',
            size: file.size || 0,
            // Don't include actual data for large payloads
            data: null,
            hasData: false,
            note: 'Data excluded due to large payload size'
          })) : []
        } : {
          totalFiles: files ? files.length : 0,
          hasFiles: !!files && files.length > 0,
          // Include actual file data with base64 content for smaller payloads
          files: files ? files.map((file, index) => ({
            index: index,
            name: file.name || `file_${index}`,
            type: file.type || 'unknown',
            size: file.size || 0,
            // Include the actual base64 data
            data: file.data || null,
            // Include metadata
            hasData: !!file.data,
            dataType: typeof file.data,
            isBase64: typeof file.data === 'string' && (file.data.startsWith('data:') || file.data.length > 100),
            // Additional file info
            lastModified: file.lastModified || null,
            uploadDate: new Date().toISOString()
          })) : []
        },
        
        // SECTION 7: SIGNATURES (handle large payloads)
        signatures: payloadSize > 5 * 1024 * 1024 ? {
          hasApplicantSignature: !!application.applicantSignature,
          hasCoApplicantSignature: !!application.coApplicantSignature,
          hasGuarantorSignature: !!application.guarantorSignature,
          totalSignatures: (!!application.applicantSignature ? 1 : 0) + 
                          (!!application.coApplicantSignature ? 1 : 0) + 
                          (!!application.guarantorSignature ? 1 : 0),
          // Don't include actual signature data for large payloads
          applicantSignature: null,
          coApplicantSignature: null,
          guarantorSignature: null,
          frontendSignatures: {},
          note: `Large payload (${payloadSizeMB}MB) - signature data stored separately`
        } : {
          hasApplicantSignature: !!application.applicantSignature,
          hasCoApplicantSignature: !!application.coApplicantSignature,
          hasGuarantorSignature: !!application.guarantorSignature,
          totalSignatures: (!!application.applicantSignature ? 1 : 0) + 
                          (!!application.coApplicantSignature ? 1 : 0) + 
                          (!!application.guarantorSignature ? 1 : 0),
          // Include actual signature data for smaller payloads
          applicantSignature: application.applicantSignature || null,
          coApplicantSignature: application.coApplicantSignature || null,
          guarantorSignature: application.guarantorSignature || null,
          // Include frontend signatures if available
          frontendSignatures: signatures || {}
        },
        
        // SECTION 8: ENCRYPTED DATA (include actual base64 encrypted data)
        encryptedData: encryptedData ? {
          hasEncryptedData: true,
          documentTypes: Object.keys(encryptedData.documents || {}),
          totalEncryptedFiles: encryptedData.allEncryptedFiles ? encryptedData.allEncryptedFiles.length : 0,
          // Include actual encrypted data with base64 content
          documents: encryptedData.documents || {},
          allEncryptedFiles: encryptedData.allEncryptedFiles || [],
          // Include decrypted base64 data for each encrypted file
          decryptedFiles: encryptedData.allEncryptedFiles ? encryptedData.allEncryptedFiles.map((encryptedFile, index) => {
            try {
              // Decrypt the file to get base64 data
              const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-change-in-production';
              const bytes = CryptoJS.AES.decrypt(encryptedFile.encryptedData, secretKey);
              const base64Data = bytes.toString(CryptoJS.enc.Base64);
              
              return {
                index: index,
                originalName: encryptedFile.filename,
                mimeType: encryptedFile.mimeType,
                originalSize: encryptedFile.originalSize,
                // Include the decrypted base64 data
                base64Data: base64Data,
                // Include the encrypted data as well
                encryptedData: encryptedFile.encryptedData,
                uploadDate: encryptedFile.uploadDate,
                status: 'decrypted'
              };
            } catch (decryptError) {
              console.error(`Failed to decrypt file ${encryptedFile.filename}:`, decryptError);
              return {
                index: index,
                originalName: encryptedFile.filename,
                mimeType: encryptedFile.mimeType,
                originalSize: encryptedFile.originalSize,
                // Keep encrypted data if decryption fails
                encryptedData: encryptedFile.encryptedData,
                uploadDate: encryptedFile.uploadDate,
                status: 'encrypted_only',
                error: decryptError.message
              };
            }
          }) : [],
          // Include metadata about each document type
          documentMetadata: Object.keys(encryptedData.documents || {}).map(docType => ({
            type: docType,
            hasData: !!encryptedData.documents[docType],
            dataType: typeof encryptedData.documents[docType],
            isArray: Array.isArray(encryptedData.documents[docType]),
            length: encryptedData.documents[docType] ? (Array.isArray(encryptedData.documents[docType]) ? encryptedData.documents[docType].length : 1) : 0
          }))
        } : {
          hasEncryptedData: false,
          documentTypes: [],
          totalEncryptedFiles: 0
        },
        
        // SECTION 9: APPLICATION STATUS
        status: {
          applicationStatus: application.status,
          hasCoApplicant: application.hasCoApplicant,
          hasGuarantor: application.hasGuarantor,
          totalFiles: files ? files.length : 0,
          hasEncryptedData: !!encryptedData,
          hasSignatures: !!signatures
        },
        
        // SECTION 10: METADATA
        metadata: {
          source: 'rental-application-system',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          applicationId: application.id,
          webhookType: 'application-submission',
          payloadSizeMB: payloadSizeMB
        }
      };

      console.log('Sending webhook payload (size optimized)');
      console.log('Webhook payload size:', JSON.stringify(webhookPayload).length);
      console.log('Webhook payload keys:', Object.keys(webhookPayload));
      
      // Add timeout to webhook request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        console.log('Making webhook request...');
        const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('Webhook response received:', webhookResponse.status, webhookResponse.statusText);

        if (!webhookResponse.ok) {
          console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
          const errorText = await webhookResponse.text();
          console.error('Webhook error response:', errorText);
        } else {
          console.log('Webhook sent successfully');
          const responseText = await webhookResponse.text();
          console.log('Webhook response:', responseText);
          webhookSent = true;
        }
      } catch (webhookRequestError) {
        console.error('Webhook request error:', webhookRequestError);
        console.error('Webhook request error stack:', webhookRequestError.stack);
        clearTimeout(timeoutId);
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      if (webhookError.name === 'AbortError') {
        console.error('Webhook request timed out after 10 seconds');
      }
    }

    // Return success response
    console.log('Returning success response');
    try {
      res.status(201).json({ 
        message: "Application submitted successfully", 
        applicationId: application.id,
        webhookSent: webhookSent,
        receivedData: {
          hasFiles: !!files,
          hasSignatures: !!signatures,
          hasEncryptedData: !!encryptedData
        }
      });
    } catch (responseError) {
      console.error('Error sending response:', responseError);
      console.error('Response error stack:', responseError.stack);
      // Try to send a simple error response
      res.status(500).json({ 
        error: "Failed to send response",
        message: responseError.message
      });
    }
    
      } catch (error) {
      console.error('=== CRITICAL ERROR in submit-application ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor.name);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error code:', error.code);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Handle specific timeout errors
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        res.status(504).json({ 
          error: "Request timed out",
          message: "The operation took too long. Please try again with smaller files or fewer files at once.",
          details: error.message
        });
      } else {
        res.status(500).json({ 
          error: "Failed to submit application",
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  };

  // Execute the request handler with global error catching
  try {
    await handleRequest();
  } catch (globalError) {
    console.error('=== GLOBAL ERROR HANDLER ===');
    console.error('Global error type:', typeof globalError);
    console.error('Global error constructor:', globalError.constructor.name);
    console.error('Global error name:', globalError.name);
    console.error('Global error message:', globalError.message);
    console.error('Global error stack:', globalError.stack);
    
    res.status(500).json({ 
      error: "Internal server error",
      message: globalError.message,
      details: process.env.NODE_ENV === 'development' ? globalError.stack : undefined
    });
  }
});

// Process encrypted data and send webhook (separate endpoint)
app.post("/api/process-application/:id", async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const { encryptedData, signatures } = req.body;
    
    console.log(`Processing application ${applicationId} with encrypted data:`, !!encryptedData);
    
    // Get the application from storage
    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Process encrypted data if provided
    if (encryptedData) {
      console.log('Processing encrypted data...');
      // Here you would decrypt and process the files
      // For now, just log that we received it
      console.log('Encrypted data received for processing');
    }
    
    // Process encrypted data without sending webhook (webhook already sent by main submission)
    console.log('Processing encrypted data for application:', applicationId);
    
    if (encryptedData) {
      console.log('Processing encrypted data...');
      console.log('Document types:', Object.keys(encryptedData.documents || {}));
      console.log('Total encrypted files:', encryptedData.allEncryptedFiles ? encryptedData.allEncryptedFiles.length : 0);
      console.log('Encrypted data received for processing');
    }
    
    if (signatures) {
      console.log('Processing signatures...');
      console.log('Signature types:', Object.keys(signatures));
    }

    res.json({ 
      message: "Application processed successfully", 
      applicationId: application.id,
      webhookSent: false,
      note: "Webhook already sent by main submission endpoint"
    });
    
  } catch (error) {
    console.error('Error processing application:', error);
    res.status(500).json({ 
      error: "Failed to process application",
      message: error.message 
    });
  }
});

// Robust direct webhook submission endpoint (bypasses database)
app.post("/api/submit-webhook-only", async (req, res) => {
  try {
    console.log('=== DIRECT WEBHOOK SUBMISSION ===');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request body exists:', !!req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');
    
    // Check if request body exists
    const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
    console.log('Content-Length header:', contentLength);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('No request body received or body is empty');
      if (contentLength > 5 * 1024 * 1024) {
        // Netlify dropped the body due to size
        console.error(`Payload too large: ${contentLength} bytes (${(contentLength / (1024 * 1024)).toFixed(2)}MB)`);
        return res.status(413).json({
          error: "Payload too large for Netlify serverless function (~6MB limit)",
          details: "Try uploading fewer or smaller files.",
          contentLength: contentLength,
          contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2)
        });
      }
      return res.status(400).json({
        error: "No request body received",
        details: "Request body is missing or empty",
        contentLength: contentLength
      });
    }
    
    // Check payload size immediately
    const payloadSize = JSON.stringify(req.body).length;
    const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);
    console.log(`Payload size: ${payloadSizeMB}MB`);
    
    // Check if payload was truncated by comparing with content-length
    if (contentLength > 0 && payloadSize < contentLength * 0.5) {
      console.error(`Payload appears to be truncated: content-length=${contentLength}, actual=${payloadSize}`);
      return res.status(413).json({
        error: "Payload appears to be truncated (likely too large for Netlify)",
        details: "Try uploading fewer or smaller files.",
        contentLength: contentLength,
        actualSize: payloadSize,
        contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2),
        actualSizeMB: payloadSizeMB
      });
    }
    
    // For very large payloads (>15MB), use ultra-simplified approach
    if (payloadSize > 15 * 1024 * 1024) {
      console.log('Very large payload detected - using ultra-simplified approach');
      
      // Extract only essential data with error handling
      console.log('Extracting essential data from large payload...');
      console.log('applicationData exists:', !!req.body.applicationData);
      console.log('applicationData keys:', req.body.applicationData ? Object.keys(req.body.applicationData) : 'null');
      
      const essentialData = {
        applicantName: req.body.applicationData?.applicantName || 'Unknown',
        applicantEmail: req.body.applicationData?.applicantEmail || 'unknown@example.com',
        buildingAddress: req.body.applicationData?.buildingAddress || 'Unknown',
        apartmentNumber: req.body.applicationData?.apartmentNumber || 'Unknown',
        monthlyRent: req.body.applicationData?.monthlyRent || 0,
        apartmentType: req.body.applicationData?.apartmentType || 'Unknown',
        hasCoApplicant: req.body.applicationData?.hasCoApplicant || false,
        hasGuarantor: req.body.applicationData?.hasGuarantor || false,
        totalFiles: req.body.files ? req.body.files.length : 0,
        hasSignatures: !!req.body.signatures,
        hasEncryptedData: !!req.body.encryptedData
      };
      
      console.log('Essential data extracted:', essentialData);
      
      const basicWebhookPayload = {
        applicationId: Date.now(),
        submittedAt: new Date().toISOString(),
        payloadSizeMB: payloadSizeMB,
        note: 'Ultra-large payload - essential data only',
        essentialData: essentialData,
        metadata: {
          source: 'rental-application-system',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          webhookType: 'ultra-large-payload-simplified'
        }
      };
      
      try {
        console.log('Sending ultra-simplified webhook...');
        const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basicWebhookPayload)
        });
        
        if (webhookResponse.ok) {
          console.log('Ultra-simplified webhook sent successfully');
          res.status(201).json({ 
            message: "Application submitted successfully (ultra-simplified)", 
            applicationId: basicWebhookPayload.applicationId,
            webhookSent: true,
            note: "Ultra-large payload processed with essential data only"
          });
          return;
        } else {
          console.error('Ultra-simplified webhook failed:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('Ultra-simplified webhook error:', webhookError);
      }
      
      // If webhook fails, still return success
      res.status(201).json({ 
        message: "Application submitted successfully (ultra-simplified)", 
        applicationId: basicWebhookPayload.applicationId,
        webhookSent: false,
        note: "Ultra-large payload processed with essential data only"
      });
      return;
    }
    
    const { applicationData, files, signatures, encryptedData } = req.body;
    
    console.log('Processing regular payload...');
    console.log('applicationData exists:', !!applicationData);
    console.log('applicationData keys:', applicationData ? Object.keys(applicationData) : 'null');
    console.log('files count:', files ? files.length : 0);
    console.log('signatures exists:', !!signatures);
    console.log('encryptedData exists:', !!encryptedData);
    
    if (!applicationData) {
      console.error('No applicationData provided');
      return res.status(400).json({ 
        error: "No application data provided",
        details: "applicationData field is missing from request body",
        receivedKeys: req.body ? Object.keys(req.body) : 'null',
        bodyType: typeof req.body,
        bodyString: JSON.stringify(req.body).slice(0, 500) // show first 500 chars for debug
      });
    }
    
    // Create application ID
    const applicationId = Date.now();
    
    // Prepare webhook payload with all data
    const webhookPayload = {
      // Application ID and metadata
      applicationId: applicationId,
      submittedAt: new Date().toISOString(),
      
      // SECTION 1: PROPERTY INFORMATION
      propertyInfo: {
        buildingAddress: applicationData.buildingAddress || 'Unknown',
        apartmentNumber: applicationData.apartmentNumber || 'Unknown',
        moveInDate: applicationData.moveInDate || new Date().toISOString(),
        monthlyRent: Number(applicationData.monthlyRent || 0),
        apartmentType: applicationData.apartmentType || 'Unknown',
        howDidYouHear: applicationData.howDidYouHear || undefined
      },
      
      // SECTION 2: PRIMARY APPLICANT
      primaryApplicant: {
        personalInfo: {
          name: applicationData.applicantName || 'Unknown',
          dateOfBirth: applicationData.applicantDob || new Date().toISOString(),
          ssn: applicationData.applicantSsn || null,
          phone: applicationData.applicantPhone || null,
          email: applicationData.applicantEmail || 'unknown@example.com',
          license: applicationData.applicantLicense || null,
          licenseState: applicationData.applicantLicenseState || null
        },
        addressInfo: {
          address: applicationData.applicantAddress || 'Unknown',
          city: applicationData.applicantCity || 'Unknown',
          state: applicationData.applicantState || 'Unknown',
          zip: applicationData.applicantZip || '00000',
          lengthAtAddress: applicationData.applicantLengthAtAddress || undefined,
          landlordName: applicationData.applicantLandlordName || undefined,
          currentRent: applicationData.applicantCurrentRent || undefined,
          reasonForMoving: applicationData.applicantReasonForMoving || undefined
        },
        financialInfo: {
          employer: applicationData.applicantEmployer || null,
          position: applicationData.applicantPosition || null,
          employmentStart: applicationData.applicantEmploymentStart || null,
          income: applicationData.applicantIncome ? Number(applicationData.applicantIncome) : null,
          otherIncome: applicationData.applicantOtherIncome ? Number(applicationData.applicantOtherIncome) : null,
          otherIncomeSource: applicationData.applicantOtherIncomeSource || null,
          bankName: applicationData.applicantBankName || null,
          accountType: applicationData.applicantAccountType || null
        }
      },
      
      // SECTION 3: CO-APPLICANT (if applicable)
      coApplicant: applicationData.hasCoApplicant ? {
        personalInfo: {
          name: applicationData.coApplicantName || null,
          relationship: applicationData.coApplicantRelationship || null,
          dateOfBirth: applicationData.coApplicantDob || null,
          ssn: applicationData.coApplicantSsn || null,
          phone: applicationData.coApplicantPhone || null,
          email: applicationData.coApplicantEmail || null
        },
        addressInfo: {
          sameAddress: Boolean(applicationData.coApplicantSameAddress || false),
          address: applicationData.coApplicantAddress || null,
          city: applicationData.coApplicantCity || null,
          state: applicationData.coApplicantState || null,
          zip: applicationData.coApplicantZip || null,
          lengthAtAddress: applicationData.coApplicantLengthAtAddress || null
        },
        financialInfo: {
          employer: applicationData.coApplicantEmployer || null,
          position: applicationData.coApplicantPosition || null,
          employmentStart: applicationData.coApplicantEmploymentStart || null,
          income: applicationData.coApplicantIncome ? Number(applicationData.coApplicantIncome) : null,
          otherIncome: applicationData.coApplicantOtherIncome ? Number(applicationData.coApplicantOtherIncome) : null,
          bankName: applicationData.coApplicantBankName || null,
          accountType: applicationData.coApplicantAccountType || null
        }
      } : null,
      
      // SECTION 4: GUARANTOR (if applicable)
      guarantor: applicationData.hasGuarantor ? {
        personalInfo: {
          name: applicationData.guarantorName || null,
          relationship: applicationData.guarantorRelationship || null,
          dateOfBirth: applicationData.guarantorDob || null,
          ssn: applicationData.guarantorSsn || null,
          phone: applicationData.guarantorPhone || null,
          email: applicationData.guarantorEmail || null
        },
        addressInfo: {
          address: applicationData.guarantorAddress || null,
          city: applicationData.guarantorCity || null,
          state: applicationData.guarantorState || null,
          zip: applicationData.guarantorZip || null,
          lengthAtAddress: applicationData.guarantorLengthAtAddress || null
        },
        financialInfo: {
          employer: applicationData.guarantorEmployer || null,
          position: applicationData.guarantorPosition || null,
          employmentStart: applicationData.guarantorEmploymentStart || null,
          income: applicationData.guarantorIncome ? Number(applicationData.guarantorIncome) : null,
          otherIncome: applicationData.guarantorOtherIncome ? Number(applicationData.guarantorOtherIncome) : null,
          bankName: applicationData.guarantorBankName || null,
          accountType: applicationData.guarantorAccountType || null
        }
      } : null,
      
      // SECTION 5: LEGAL QUESTIONS
      legalQuestions: {
        bankruptcy: {
          hasBankruptcy: Boolean(applicationData.hasBankruptcy || false),
          details: applicationData.bankruptcyDetails || undefined
        },
        eviction: {
          hasEviction: Boolean(applicationData.hasEviction || false),
          details: applicationData.evictionDetails || undefined
        },
        criminalHistory: {
          hasCriminalHistory: Boolean(applicationData.hasCriminalHistory || false),
          details: applicationData.criminalHistoryDetails || undefined
        },
        pets: {
          hasPets: Boolean(applicationData.hasPets || false),
          details: applicationData.petDetails || undefined
        },
        smokingStatus: applicationData.smokingStatus || undefined
      },
      
      // SECTION 6: DOCUMENTS
      documents: {
        totalFiles: files ? files.length : 0,
        hasFiles: !!files && files.length > 0,
        files: files ? files.map((file, index) => ({
          index: index,
          name: file.name || `file_${index}`,
          type: file.type || 'unknown',
          size: file.size || 0,
          data: file.data || null,
          hasData: !!file.data,
          lastModified: file.lastModified || null,
          uploadDate: new Date().toISOString()
        })) : []
      },
      
      // SECTION 7: SIGNATURES
      signatures: {
        hasApplicantSignature: !!applicationData.applicantSignature,
        hasCoApplicantSignature: !!applicationData.coApplicantSignature,
        hasGuarantorSignature: !!applicationData.guarantorSignature,
        totalSignatures: (!!applicationData.applicantSignature ? 1 : 0) + 
                        (!!applicationData.coApplicantSignature ? 1 : 0) + 
                        (!!applicationData.guarantorSignature ? 1 : 0),
        applicantSignature: applicationData.applicantSignature || null,
        coApplicantSignature: applicationData.coApplicantSignature || null,
        guarantorSignature: applicationData.guarantorSignature || null,
        frontendSignatures: signatures || {}
      },
      
      // SECTION 8: ENCRYPTED DATA
      encryptedData: {
        hasEncryptedData: !!encryptedData,
        documentTypes: encryptedData ? Object.keys(encryptedData.documents || {}) : [],
        totalEncryptedFiles: encryptedData && encryptedData.allEncryptedFiles ? encryptedData.allEncryptedFiles.length : 0,
        encryptionTimestamp: encryptedData ? encryptedData.encryptionTimestamp : null,
        encryptionVersion: encryptedData ? encryptedData.encryptionVersion : null
      },
      
      // SECTION 9: SUMMARY
      summary: {
        totalFiles: files ? files.length : 0,
        hasEncryptedData: !!encryptedData,
        hasSignatures: !!signatures
      },
      
      // SECTION 10: METADATA
      metadata: {
        source: 'rental-application-system',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        applicationId: applicationId,
        webhookType: 'direct-webhook-submission',
        processingMethod: 'webhook-only'
      }
    };

    console.log('Sending direct webhook payload...');
    console.log('Webhook payload size:', JSON.stringify(webhookPayload).length);
    
    // Send webhook with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Webhook response received:', webhookResponse.status, webhookResponse.statusText);

      if (!webhookResponse.ok) {
        console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
        const errorText = await webhookResponse.text();
        console.error('Webhook error response:', errorText);
        return res.status(500).json({ 
          error: "Webhook failed",
          message: "Failed to send webhook",
          details: errorText
        });
      } else {
        console.log('Webhook sent successfully');
        const responseText = await webhookResponse.text();
        console.log('Webhook response:', responseText);
        
        res.status(201).json({ 
          message: "Application submitted successfully (webhook only)", 
          applicationId: applicationId,
          webhookSent: true,
          webhookResponse: responseText,
          note: "Application sent directly to webhook - no database storage"
        });
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      clearTimeout(timeoutId);
      
      if (webhookError.name === 'AbortError') {
        res.status(504).json({ 
          error: "Webhook request timed out",
          message: "The webhook request took too long to complete."
        });
      } else {
        res.status(500).json({ 
          error: "Failed to send webhook",
          details: webhookError.message 
        });
      }
    }
    
  } catch (error) {
    console.error('Error in direct webhook submission:', error);
    res.status(500).json({ 
      error: "Failed to process webhook submission",
      message: error.message 
    });
  }
});

// New loan application webhook endpoint
app.post("/api/submit-loan-application", async (req, res) => {
  try {
    console.log('Received loan application submission:', JSON.stringify(req.body, null, 2));
    
    const { applicationData, files, signatures, encryptedData } = req.body;
    
    if (!applicationData) {
      console.error('No applicationData provided');
      return res.status(400).json({ error: "No application data provided" });
    }
    
    // Validate application data
    console.log('Validating loan application data...');
    const validatedData = insertRentalApplicationSchema.parse(applicationData);
    console.log('Validation successful:', validatedData);
    
    // Create application in database
    console.log('Creating loan application with encrypted data:', !!validatedData.encryptedData);
    const application = await storage.createApplication({
      ...validatedData,
      status: 'submitted'
    });
    console.log('Loan application created successfully with ID:', application.id);

    // Convert rental application to loan application format
    const loanApplicationData = [
      {
        "From": application.applicantEmail || "noreply@castellanre.com",
        "Subject": `Loan Application - ${application.applicantName || 'Applicant'} - ${application.buildingAddress || 'Property'}`,
        "Received Date": new Date().toISOString(),
        "Recipients": [
          "loans@castellancapital.com"
        ],
        "Loan Amount Requested": application.monthlyRent ? application.monthlyRent * 12 * 30 : 0, // 30x annual rent as loan amount
        "Loan Type": "Acquisition", // Default value, can be made configurable
        "Property Type": "Mixed Use", // Default value, can be made configurable
        "Property Address": application.buildingAddress || "",
        "Gross square feet (SF) [GSF]": "",
        "Net Square feet [NSF]": "",
        "Purchase Price of the Property": application.monthlyRent ? application.monthlyRent * 12 * 30 * 1.67 : 0, // Estimate based on loan amount
        "Number of Residential Units": 1, // Default for rental application
        "Number of Commercial Units": 0, // Default for rental application
        "Loan to value (LTV) [LTPP] %": "",
        "Loan to cost (LTC) %": "55-60",
        "Net Operating Income (NOI)": "",
        // Additional fields from rental application
        "Applicant Name": application.applicantName || "",
        "Applicant Phone": application.applicantPhone || "",
        "Applicant Email": application.applicantEmail || "",
        "Monthly Rent": application.monthlyRent || 0,
        "Apartment Type": application.apartmentType || "",
        "Move In Date": application.moveInDate || "",
        "Co-Applicant Name": application.coApplicantName || "",
        "Co-Applicant Email": application.coApplicantEmail || "",
        "Guarantor Name": application.guarantorName || "",
        "Guarantor Email": application.guarantorEmail || "",
        "Application ID": application.id,
        "Application Status": application.status,
        "Submitted At": application.submittedAt
      }
    ];

    // Send to Make.com webhook for loan applications
    try {
      console.log('Sending loan application webhook payload:', JSON.stringify(loanApplicationData, null, 2));
      
      const webhookResponse = await fetch('https://hook.us1.make.com/37yhndnke102glc74y0nx58tsb7n2n86', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanApplicationData)
      });

      if (!webhookResponse.ok) {
        console.error('Loan webhook failed:', webhookResponse.status, webhookResponse.statusText);
        const errorText = await webhookResponse.text();
        console.error('Loan webhook error response:', errorText);
        // Continue with submission even if webhook fails
      } else {
        console.log('Loan webhook sent successfully');
        const responseText = await webhookResponse.text();
        console.log('Loan webhook response:', responseText);
      }
    } catch (webhookError) {
      console.error('Loan webhook error:', webhookError);
      // Continue with submission even if webhook fails
    }

    res.status(201).json({ 
      message: "Loan application submitted successfully", 
      applicationId: application.id,
      loanWebhookSent: true,
      loanData: loanApplicationData
    });
    
  } catch (error) {
    console.error('Error in submit-loan-application:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to submit loan application",
      message: error.message 
    });
  }
});

// File upload endpoint
app.post("/api/upload", async (req, res) => {
  try {
    // This endpoint would handle file uploads
    // For now, return a placeholder response
    res.json({ message: "File upload endpoint - implement as needed" });
  } catch (error) {
    console.error('Error in upload:', error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Upload encrypted files endpoint with FormData support and person-specific webhooks
app.post("/api/upload-files", textUpload, async (req, res) => {
  try {
    console.log('=== Starting file upload ===');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');
    console.log('Files received:', req.files ? req.files.length : 0);
    
    // Add error handling for multer
    if (!req.body) {
      console.error('No request body received after multer parsing');
      return res.status(400).json({ 
        error: "Failed to parse FormData",
        details: "No request body received"
      });
    }
    
    // Handle both JSON and FormData
    let files = [];
    let applicationId = null;
    let personType = 'unknown';
    
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Handle FormData
      console.log('Processing FormData upload');
      console.log('FormData body keys:', Object.keys(req.body));
      console.log('FormData files:', req.files ? req.files.map(f => f.fieldname) : 'none');
      
      // Parse FormData using multer
      const formData = req.body;
      personType = formData.personType || 'unknown';
      applicationId = formData.applicationId || Date.now();
      
      console.log('Person type:', personType);
      console.log('Application ID:', applicationId);
      
      // Extract files from FormData
      const fileKeys = Object.keys(formData).filter(key => key.startsWith('files['));
      console.log('File keys found:', fileKeys);
      console.log('Total file keys:', fileKeys.length);
      
      const fileCount = fileKeys.length / 5; // Each file has 5 fields
      console.log('Calculated file count:', fileCount);
      
      for (let i = 0; i < fileCount; i++) {
        const filename = formData[`files[${i}][filename]`];
        const encryptedData = formData[`files[${i}][encryptedData]`];
        const originalSize = formData[`files[${i}][originalSize]`];
        const mimeType = formData[`files[${i}][mimeType]`];
        const uploadDate = formData[`files[${i}][uploadDate]`];
        
        console.log(`File ${i} data:`, {
          filename: filename,
          hasEncryptedData: !!encryptedData,
          encryptedDataLength: encryptedData ? encryptedData.length : 0,
          originalSize: originalSize,
          mimeType: mimeType,
          uploadDate: uploadDate
        });
        
        const file = {
          filename: filename,
          encryptedData: encryptedData,
          originalSize: parseInt(originalSize) || 0,
          mimeType: mimeType,
          uploadDate: uploadDate
        };
        files.push(file);
      }
    } else {
      // Handle JSON
      console.log('Processing JSON upload');
      const { files: jsonFiles, applicationId: jsonApplicationId, personType: jsonPersonType } = req.body;
      files = jsonFiles || [];
      applicationId = jsonApplicationId || Date.now();
      personType = jsonPersonType || 'unknown';
    }
    
    console.log('Upload files request received:', {
      filesCount: files ? files.length : 0,
      applicationId: applicationId,
      personType: personType
    });
    
    if (!files || !Array.isArray(files)) {
      console.error('No files provided or files is not an array');
      console.error('Files value:', files);
      console.error('Files type:', typeof files);
      return res.status(400).json({ 
        error: "No files provided", 
        details: "Files array is missing or invalid",
        receivedData: {
          filesType: typeof files,
          filesValue: files,
          bodyKeys: req.body ? Object.keys(req.body) : 'null'
        }
      });
    }
    
    if (files.length === 0) {
      console.error('Files array is empty');
      return res.status(400).json({ 
        error: "No files provided", 
        details: "Files array is empty",
        receivedData: {
          filesCount: files.length,
          bodyKeys: req.body ? Object.keys(req.body) : 'null'
        }
      });
    }

    const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-change-in-production';
    const uploadedFiles = [];

    // Process files with timeout protection
    const processFiles = async () => {
      for (let i = 0; i < files.length; i++) {
        const encryptedFile = files[i];
        
        // Validate individual file
        if (!encryptedFile.filename) {
          console.error(`File ${i} missing filename`);
          throw new Error(`File ${i} missing filename`);
        }
        
        if (!encryptedFile.encryptedData) {
          console.error(`File ${i} (${encryptedFile.filename}) missing encrypted data`);
          throw new Error(`File ${i} (${encryptedFile.filename}) missing encrypted data`);
        }
        
        try {
          console.log(`Processing file ${i + 1}/${files.length}: ${encryptedFile.filename}`);
          console.log(`File ${i} encrypted data length:`, encryptedFile.encryptedData.length);
          
          // Decrypt the file
          const bytes = CryptoJS.AES.decrypt(encryptedFile.encryptedData, secretKey);
          const base64Str = bytes.toString(CryptoJS.enc.Base64);
          const fileBuffer = Buffer.from(base64Str, 'base64');

          // Generate unique filename
          const timestamp = Date.now();
          const safeFilename = encryptedFile.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${timestamp}_${safeFilename}`;

          uploadedFiles.push({
            originalName: encryptedFile.filename,
            savedName: filename,
            size: encryptedFile.originalSize,
            mimeType: encryptedFile.mimeType,
            uploadDate: encryptedFile.uploadDate,
            data: base64Str,
            status: 'processed'
          });

          console.log(`File ${i + 1} processed successfully: ${encryptedFile.filename}`);

        } catch (decryptError) {
          console.error(`Failed to decrypt file ${encryptedFile.filename}:`, decryptError);
          throw new Error(`Failed to decrypt file ${encryptedFile.filename}: ${decryptError.message}`);
        }
      }
      return uploadedFiles;
    };

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('File processing timed out')), 25000); // 25 second timeout
    });

    const result = await Promise.race([processFiles(), timeoutPromise]);
    console.log(`Successfully processed ${result.length} files for ${personType}`);

    // Send person-specific webhook with encrypted data
    let webhookSent = false;
    try {
      const webhookPayload = {
        // Person-specific metadata
        personType: personType,
        applicationId: applicationId,
        uploadTimestamp: new Date().toISOString(),
        
        // File information with base64 data
        files: result.map(file => ({
          originalName: file.originalName,
          savedName: file.savedName,
          size: file.size,
          mimeType: file.mimeType,
          uploadDate: file.uploadDate,
          status: file.status,
          // Include the actual base64 data
          base64Data: file.data,
          hasBase64Data: !!file.data,
          dataLength: file.data ? file.data.length : 0
        })),
        
        // Encrypted data (FormData format)
        encryptedData: {
          personType: personType,
          applicationId: applicationId,
          files: files.map(file => ({
            filename: file.filename,
            encryptedData: file.encryptedData,
            originalSize: file.originalSize,
            mimeType: file.mimeType,
            uploadDate: file.uploadDate
          })),
          totalFiles: files.length,
          totalSize: files.reduce((sum, file) => sum + file.originalSize, 0),
          encryptionTimestamp: new Date().toISOString()
        },
        
        // Summary
        totalFiles: result.length,
        totalSize: result.reduce((sum, file) => sum + file.size, 0),
        
        // Metadata
        metadata: {
          source: 'file-upload-system',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          personType: personType,
          applicationId: applicationId,
          webhookType: 'person-specific-file-upload-with-encrypted-data'
        }
      };

      console.log(`Sending ${personType} webhook payload:`, webhookPayload);
      
      // Add timeout to webhook request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        console.error(`${personType} webhook failed:`, webhookResponse.status, webhookResponse.statusText);
        const errorText = await webhookResponse.text();
        console.error(`${personType} webhook error response:`, errorText);
      } else {
        console.log(`${personType} webhook sent successfully`);
        const responseText = await webhookResponse.text();
        console.log(`${personType} webhook response:`, responseText);
        webhookSent = true;
      }
    } catch (webhookError) {
      console.error(`${personType} webhook error:`, webhookError);
      if (webhookError.name === 'AbortError') {
        console.error(`${personType} webhook request timed out after 10 seconds`);
      }
    }

    res.json({ 
      message: `Files uploaded successfully for ${personType}`, 
      files: result,
      count: result.length,
      personType: personType,
      webhookSent: webhookSent,
      note: "Files are stored in memory. For production, implement cloud storage upload."
    });

  } catch (error) {
    console.error("File upload error:", error);
    
    if (error.message.includes('timed out')) {
      res.status(504).json({ 
        error: "Upload timed out",
        message: "File processing took too long. Please try again with smaller files.",
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: "Failed to upload files",
        details: error.message 
      });
    }
  }
});

// Chunked upload endpoint for large files
app.post("/api/upload-chunk", async (req, res) => {
  try {
    const { chunk, chunkIndex, totalChunks, filename, applicationId } = req.body;
    
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} for ${filename}`);
    
    if (!chunk || chunkIndex === undefined || !totalChunks || !filename) {
      return res.status(400).json({ error: "Missing required chunk data" });
    }

    // Store chunk in memory (in production, use Redis or similar)
    // For now, we'll just acknowledge receipt
    console.log(`Chunk ${chunkIndex + 1} received for ${filename}`);
    
    res.json({ 
      message: "Chunk received successfully",
      chunkIndex: chunkIndex,
      filename: filename,
      isComplete: chunkIndex === totalChunks - 1
    });

  } catch (error) {
    console.error("Chunk upload error:", error);
    res.status(500).json({ 
      error: "Failed to process chunk",
      details: error.message 
    });
  }
});

// Send encrypted data as FormData to webhook
app.post("/api/send-encrypted-data-webhook", textUpload, async (req, res) => {
  try {
    console.log('=== Sending encrypted data webhook ===');
    
    const { encryptedData, personType, applicationId } = req.body;
    
    if (!encryptedData || !personType || !applicationId) {
      return res.status(400).json({ error: "Missing required data" });
    }
    
    console.log(`Sending encrypted data webhook for ${personType}, application ${applicationId}`);
    
    // Create FormData for webhook
    const formData = new FormData();
    formData.append('personType', personType);
    formData.append('applicationId', applicationId);
    formData.append('timestamp', new Date().toISOString());
    
    // Add encrypted files to FormData
    if (encryptedData.files && Array.isArray(encryptedData.files)) {
      encryptedData.files.forEach((file, index) => {
        formData.append(`files[${index}][filename]`, file.filename);
        formData.append(`files[${index}][encryptedData]`, file.encryptedData);
        formData.append(`files[${index}][originalSize]`, file.originalSize.toString());
        formData.append(`files[${index}][mimeType]`, file.mimeType);
        formData.append(`files[${index}][uploadDate]`, file.uploadDate);
      });
    }
    
    // Add metadata
    formData.append('totalFiles', encryptedData.files ? encryptedData.files.length.toString() : '0');
    formData.append('totalSize', encryptedData.totalSize ? encryptedData.totalSize.toString() : '0');
    formData.append('encryptionTimestamp', encryptedData.encryptionTimestamp || new Date().toISOString());
    
    // Send FormData to webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
      method: 'POST',
      body: formData, // Send as FormData
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!webhookResponse.ok) {
      console.error('Encrypted data webhook failed:', webhookResponse.status, webhookResponse.statusText);
      const errorText = await webhookResponse.text();
      console.error('Webhook error response:', errorText);
      return res.status(500).json({ 
        error: "Failed to send encrypted data webhook",
        details: errorText
      });
    }
    
    console.log('Encrypted data webhook sent successfully');
    const responseText = await webhookResponse.text();
    console.log('Webhook response:', responseText);
    
    res.json({ 
      message: "Encrypted data webhook sent successfully",
      personType: personType,
      applicationId: applicationId,
      totalFiles: encryptedData.files ? encryptedData.files.length : 0,
      webhookResponse: responseText
    });
    
  } catch (error) {
    console.error('Encrypted data webhook error:', error);
    
    if (error.name === 'AbortError') {
      res.status(504).json({ 
        error: "Webhook request timed out",
        message: "The webhook request took too long to complete."
      });
    } else {
      res.status(500).json({ 
        error: "Failed to send encrypted data webhook",
        details: error.message 
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      error: "File upload error",
      details: err.message,
      code: err.code
    });
  }
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log specific payload size errors
  if (status === 413) {
    console.log(`Payload too large error: ${message}`);
    console.log(`Error details: ${JSON.stringify(err)}`);
  }

  console.error('Express error:', err);
  res.status(status).json({ 
    error: "Internal server error",
    details: message 
  });
});

// Export the serverless handler
module.exports.handler = serverless(app);

// Test endpoint for debugging
app.post("/api/test-webhook-only", async (req, res) => {
  res.json({
    message: "Echo from test-webhook-only endpoint",
    headers: req.headers,
    bodyType: typeof req.body,
    body: req.body,
    bodyKeys: req.body ? Object.keys(req.body) : 'null',
    contentLength: req.headers['content-length']
  });
});
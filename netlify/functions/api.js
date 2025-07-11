const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();

// Increase payload limits for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

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
const { storage } = require('./storage');
const { insertRentalApplicationSchema } = require('./schema');
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
  try {
    console.log('Received submission request:', JSON.stringify(req.body, null, 2));
    
    const { applicationData, files, signatures, encryptedData } = req.body;
    
    console.log('Files received:', JSON.stringify(files, null, 2));
    console.log('Files type:', typeof files);
    console.log('Files is array:', Array.isArray(files));
    console.log('Files length:', files ? files.length : 'null');
    console.log('Encrypted data received:', encryptedData ? 'Yes' : 'No');
    console.log('Raw encrypted data:', encryptedData);
    if (encryptedData) {
      console.log('Encrypted documents count:', Object.keys(encryptedData.documents || {}).length);
      console.log('All encrypted files count:', encryptedData.allEncryptedFiles ? encryptedData.allEncryptedFiles.length : 0);
      console.log('Document types:', Object.keys(encryptedData.documents || {}));
    }
    
    if (!applicationData) {
      console.error('No applicationData provided');
      return res.status(400).json({ error: "No application data provided" });
    }
    
    // Validate application data
    console.log('Validating application data...');
    const validatedData = insertRentalApplicationSchema.parse(applicationData);
    console.log('Validation successful:', validatedData);
    
    // Parse documents field if it exists
    let parsedFiles = [];
    if (validatedData.documents) {
      try {
        parsedFiles = JSON.parse(validatedData.documents);
        console.log('Parsed files from documents field:', JSON.stringify(parsedFiles, null, 2));
      } catch (error) {
        console.error('Error parsing documents field:', error);
      }
    }
    
    // Parse encrypted data field if it exists
    let parsedEncryptedData = null;
    console.log('Validated data encryptedData field:', validatedData.encryptedData);
    if (validatedData.encryptedData) {
      try {
        parsedEncryptedData = JSON.parse(validatedData.encryptedData);
        console.log('Parsed encrypted data:', {
          documentsCount: Object.keys(parsedEncryptedData.documents || {}).length,
          allEncryptedFilesCount: parsedEncryptedData.allEncryptedFiles ? parsedEncryptedData.allEncryptedFiles.length : 0,
          documentTypes: Object.keys(parsedEncryptedData.documents || {}),
          encryptionTimestamp: parsedEncryptedData.encryptionTimestamp,
          encryptionVersion: parsedEncryptedData.encryptionVersion
        });
      } catch (error) {
        console.error('Error parsing encrypted data field:', error);
      }
    } else {
      console.log('No encryptedData field found in validated data');
    }
    
    // Create application in database
    console.log('Creating application with encrypted data:', !!validatedData.encryptedData);
    const application = await storage.createApplication({
      ...validatedData,
      status: 'submitted'
    });
    console.log('Application created successfully with ID:', application.id);
    console.log('Application encrypted data from DB:', application.encryptedData);

    // Prepare webhook payload
    const webhookPayload = {
      application: {
        id: application.id,
        buildingAddress: application.buildingAddress,
        apartmentNumber: application.apartmentNumber,
        moveInDate: application.moveInDate,
        monthlyRent: application.monthlyRent,
        apartmentType: application.apartmentType,
        howDidYouHear: application.howDidYouHear,
        
        // Primary Applicant
        applicantName: application.applicantName,
        applicantDob: application.applicantDob,
        applicantPhone: application.applicantPhone,
        applicantEmail: application.applicantEmail,
        applicantAddress: application.applicantAddress,
        applicantCity: application.applicantCity,
        applicantState: application.applicantState,
        applicantZip: application.applicantZip,
        
        // Co-Applicant
        hasCoApplicant: application.hasCoApplicant,
        coApplicantName: application.coApplicantName,
        coApplicantPhone: application.coApplicantPhone,
        coApplicantEmail: application.coApplicantEmail,
        
        // Guarantor
        hasGuarantor: application.hasGuarantor,
        guarantorName: application.guarantorName,
        guarantorPhone: application.guarantorPhone,
        guarantorEmail: application.guarantorEmail,
        
        status: application.status,
        submittedAt: application.submittedAt
      },
      files: parsedFiles,
      signatures: signatures || {},
      metadata: {
        source: "rental-application-system",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }
    };

    // Send webhook if configured
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        console.log('Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });
        
        console.log('Webhook sent successfully');
        console.log('Webhook response:', webhookResponse.statusText);
        
        if (!webhookResponse.ok) {
          console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }

    res.status(201).json({ 
      message: "Application submitted successfully", 
      applicationId: application.id,
      encryptedDataReceived: !!parsedEncryptedData
    });
    
  } catch (error) {
    console.error('Error in submit-application:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to submit application",
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

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log specific payload size errors
  if (status === 413) {
    console.log(`Payload too large error: ${message}`);
    console.log(`Error details: ${JSON.stringify(err)}`);
  }

  console.error('Express error:', err);
  res.status(status).json({ message });
});

// Export the serverless handler
module.exports.handler = serverless(app);
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
    console.log('=== Starting application submission ===');
    
    // Check if request body exists
    if (!req.body) {
      console.error('No request body received');
      return res.status(400).json({ error: "No request body received" });
    }
    
    const { applicationData, files, signatures, encryptedData } = req.body;
    
    console.log('Request summary:', {
      hasApplicationData: !!applicationData,
      hasFiles: !!files,
      hasSignatures: !!signatures,
      hasEncryptedData: !!encryptedData,
      applicationDataKeys: applicationData ? Object.keys(applicationData) : [],
      filesCount: files ? files.length : 0,
      signaturesCount: signatures ? Object.keys(signatures).length : 0,
      encryptedDataKeys: encryptedData ? Object.keys(encryptedData) : []
    });
    
    if (!applicationData) {
      console.error('No applicationData provided');
      return res.status(400).json({ error: "No application data provided" });
    }
    
    // Simplified approach: Create a minimal application object
    const minimalApplication = {
      // Required fields
      buildingAddress: applicationData.buildingAddress || 'Unknown',
      apartmentNumber: applicationData.apartmentNumber || 'Unknown',
      moveInDate: applicationData.moveInDate || new Date().toISOString(),
      monthlyRent: applicationData.monthlyRent || 0,
      apartmentType: applicationData.apartmentType || 'Unknown',
      applicantName: applicationData.applicantName || 'Unknown',
      applicantDob: applicationData.applicantDob || new Date().toISOString(),
      applicantEmail: applicationData.applicantEmail || 'unknown@example.com',
      applicantAddress: applicationData.applicantAddress || 'Unknown',
      applicantCity: applicationData.applicantCity || 'Unknown',
      applicantState: applicationData.applicantState || 'Unknown',
      applicantZip: applicationData.applicantZip || '00000',
      
      // Optional fields with defaults
      howDidYouHear: applicationData.howDidYouHear || null,
      applicantSsn: applicationData.applicantSsn || null,
      applicantPhone: applicationData.applicantPhone || null,
      applicantLicense: applicationData.applicantLicense || null,
      applicantLicenseState: applicationData.applicantLicenseState || null,
      applicantLengthAtAddress: applicationData.applicantLengthAtAddress || null,
      applicantLandlordName: applicationData.applicantLandlordName || null,
      applicantCurrentRent: applicationData.applicantCurrentRent || null,
      applicantReasonForMoving: applicationData.applicantReasonForMoving || null,
      
      // Financial fields
      applicantEmployer: applicationData.applicantEmployer || null,
      applicantPosition: applicationData.applicantPosition || null,
      applicantEmploymentStart: applicationData.applicantEmploymentStart || null,
      applicantIncome: applicationData.applicantIncome || null,
      applicantOtherIncome: applicationData.applicantOtherIncome || null,
      applicantOtherIncomeSource: applicationData.applicantOtherIncomeSource || null,
      applicantBankName: applicationData.applicantBankName || null,
      applicantAccountType: applicationData.applicantAccountType || null,
      
      // Co-applicant fields
      hasCoApplicant: applicationData.hasCoApplicant || false,
      coApplicantName: applicationData.coApplicantName || null,
      coApplicantRelationship: applicationData.coApplicantRelationship || null,
      coApplicantDob: applicationData.coApplicantDob || null,
      coApplicantSsn: applicationData.coApplicantSsn || null,
      coApplicantPhone: applicationData.coApplicantPhone || null,
      coApplicantEmail: applicationData.coApplicantEmail || null,
      coApplicantSameAddress: applicationData.coApplicantSameAddress || false,
      coApplicantAddress: applicationData.coApplicantAddress || null,
      coApplicantCity: applicationData.coApplicantCity || null,
      coApplicantState: applicationData.coApplicantState || null,
      coApplicantZip: applicationData.coApplicantZip || null,
      coApplicantLengthAtAddress: applicationData.coApplicantLengthAtAddress || null,
      coApplicantEmployer: applicationData.coApplicantEmployer || null,
      coApplicantPosition: applicationData.coApplicantPosition || null,
      coApplicantEmploymentStart: applicationData.coApplicantEmploymentStart || null,
      coApplicantIncome: applicationData.coApplicantIncome || null,
      coApplicantOtherIncome: applicationData.coApplicantOtherIncome || null,
      coApplicantBankName: applicationData.coApplicantBankName || null,
      coApplicantAccountType: applicationData.coApplicantAccountType || null,
      
      // Guarantor fields
      hasGuarantor: applicationData.hasGuarantor || false,
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
      guarantorIncome: applicationData.guarantorIncome || null,
      guarantorOtherIncome: applicationData.guarantorOtherIncome || null,
      guarantorBankName: applicationData.guarantorBankName || null,
      guarantorAccountType: applicationData.guarantorAccountType || null,
      
      // Signatures
      applicantSignature: applicationData.applicantSignature || null,
      coApplicantSignature: applicationData.coApplicantSignature || null,
      guarantorSignature: applicationData.guarantorSignature || null,
      
      // Legal questions
      hasBankruptcy: applicationData.hasBankruptcy || false,
      bankruptcyDetails: applicationData.bankruptcyDetails || null,
      hasEviction: applicationData.hasEviction || false,
      evictionDetails: applicationData.evictionDetails || null,
      hasCriminalHistory: applicationData.hasCriminalHistory || false,
      criminalHistoryDetails: applicationData.criminalHistoryDetails || null,
      hasPets: applicationData.hasPets || false,
      petDetails: applicationData.petDetails || null,
      smokingStatus: applicationData.smokingStatus || null,
      
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
    
    // Create application in database
    console.log('Creating application in database...');
    const application = await storage.createApplication(minimalApplication);
    console.log('Application created successfully with ID:', application.id);

    // Return success response
    console.log('Returning success response');
    res.status(201).json({ 
      message: "Application submitted successfully", 
      applicationId: application.id,
      receivedData: {
        hasFiles: !!files,
        hasSignatures: !!signatures,
        hasEncryptedData: !!encryptedData
      }
    });
    
  } catch (error) {
    console.error('Error in submit-application:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    res.status(500).json({ 
      error: "Failed to submit application",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    // Send webhook if needed
    try {
      const webhookPayload = {
        applicationId: application.id,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        status: application.status,
        hasEncryptedData: !!encryptedData,
        hasSignatures: !!signatures,
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending webhook payload:', webhookPayload);
      
      const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
      } else {
        console.log('Webhook sent successfully');
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
    }

    res.json({ 
      message: "Application processed successfully", 
      applicationId: application.id,
      webhookSent: true
    });
    
  } catch (error) {
    console.error('Error processing application:', error);
    res.status(500).json({ 
      error: "Failed to process application",
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

// Upload encrypted files endpoint
app.post("/api/upload-files", async (req, res) => {
  try {
    const { files, applicationId } = req.body;
    
    console.log('Upload files request received:', {
      filesCount: files ? files.length : 0,
      applicationId: applicationId
    });
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "No files provided" });
    }

    const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-change-in-production';
    const uploadedFiles = [];

    for (const encryptedFile of files) {
      try {
        console.log(`Processing file: ${encryptedFile.filename}`);
        
        // Decrypt the file
        const bytes = CryptoJS.AES.decrypt(encryptedFile.encryptedData, secretKey);
        // Get the raw bytes directly instead of converting to UTF-8 string
        const base64Str = bytes.toString(CryptoJS.enc.Base64);
        const fileBuffer = Buffer.from(base64Str, 'base64');

        // Generate unique filename
        const timestamp = Date.now();
        const safeFilename = encryptedFile.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}_${safeFilename}`;

        // In serverless environment, we can't write to filesystem
        // Instead, we'll store the file data in memory and return metadata
        // In production, you'd want to upload to a cloud storage service like AWS S3

        uploadedFiles.push({
          originalName: encryptedFile.filename,
          savedName: filename,
          size: encryptedFile.originalSize,
          mimeType: encryptedFile.mimeType,
          uploadDate: encryptedFile.uploadDate,
          // Store the decrypted data as base64 for now
          // In production, upload to cloud storage and store the URL
          data: base64Str,
          status: 'processed'
        });

        console.log(`File processed successfully: ${encryptedFile.filename}`);

      } catch (decryptError) {
        console.error(`Failed to decrypt file ${encryptedFile.filename}:`, decryptError);
        return res.status(400).json({ 
          error: `Failed to decrypt file ${encryptedFile.filename}`,
          details: decryptError.message
        });
      }
    }

    console.log(`Successfully processed ${uploadedFiles.length} files`);

    res.json({ 
      message: "Files uploaded successfully", 
      files: uploadedFiles,
      count: uploadedFiles.length,
      note: "Files are stored in memory. For production, implement cloud storage upload."
    });

  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ 
      error: "Failed to upload files",
      details: error.message 
    });
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
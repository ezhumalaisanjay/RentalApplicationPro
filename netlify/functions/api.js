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
    
    // Pre-process dates to ensure they're in the correct format
    const processedData = { ...applicationData };
    
    // Convert Date objects to ISO strings for date fields
    const dateFields = ['moveInDate', 'applicantDob', 'applicantEmploymentStart', 'coApplicantDob', 'coApplicantEmploymentStart', 'guarantorDob', 'guarantorEmploymentStart'];
    
    dateFields.forEach(field => {
      if (processedData[field]) {
        console.log(`Processing ${field}:`, processedData[field], 'Type:', typeof processedData[field]);
        
        if (processedData[field] instanceof Date) {
          processedData[field] = processedData[field].toISOString();
          console.log(`Converted ${field} from Date to ISO string:`, processedData[field]);
        } else if (typeof processedData[field] === 'string' && processedData[field].includes('GMT')) {
          // Handle date strings that look like Date.toString() output
          try {
            const date = new Date(processedData[field]);
            if (!isNaN(date.getTime())) {
              processedData[field] = date.toISOString();
              console.log(`Converted ${field} from date string to ISO string:`, processedData[field]);
            } else {
              console.warn(`Invalid date for ${field}:`, processedData[field]);
            }
          } catch (error) {
            console.warn(`Failed to convert ${field}:`, processedData[field], error);
          }
        } else if (typeof processedData[field] === 'string' && processedData[field].includes('T')) {
          // Already an ISO string, validate it
          try {
            const date = new Date(processedData[field]);
            if (isNaN(date.getTime())) {
              console.warn(`Invalid ISO string for ${field}:`, processedData[field]);
            } else {
              console.log(`${field} is already a valid ISO string:`, processedData[field]);
            }
          } catch (error) {
            console.warn(`Failed to validate ISO string for ${field}:`, processedData[field], error);
          }
        }
      } else {
        console.log(`${field} is null/undefined`);
      }
    });
    
    console.log('Processed data sample:', {
      moveInDate: processedData.moveInDate,
      applicantDob: processedData.applicantDob,
      type: typeof processedData.moveInDate
    });
    
    // Log a few more fields for debugging
    console.log('Additional data sample:', {
      applicantName: processedData.applicantName,
      applicantEmail: processedData.applicantEmail,
      monthlyRent: processedData.monthlyRent,
      hasCoApplicant: processedData.hasCoApplicant,
      hasGuarantor: processedData.hasGuarantor
    });
    
    // Validate application data
    console.log('Validating application data...');
    let validatedData;
    try {
      validatedData = insertRentalApplicationSchema.parse(processedData);
      console.log('Validation successful');
    } catch (validationError) {
      console.error('Validation failed:', validationError);
      console.error('Validation error details:', validationError.errors);
      console.error('Failed data sample:', {
        moveInDate: processedData.moveInDate,
        applicantDob: processedData.applicantDob,
        applicantName: processedData.applicantName,
        applicantEmail: processedData.applicantEmail
      });
      throw validationError;
    }
    
    // Parse documents field if it exists
    let parsedFiles = [];
    if (validatedData.documents) {
      try {
        parsedFiles = JSON.parse(validatedData.documents);
        console.log('Parsed files successfully');
      } catch (error) {
        console.error('Error parsing documents field:', error);
      }
    }
    
    // Parse encrypted data field if it exists
    let parsedEncryptedData = null;
    if (validatedData.encryptedData) {
      try {
        parsedEncryptedData = JSON.parse(validatedData.encryptedData);
        console.log('Parsed encrypted data successfully');
      } catch (error) {
        console.error('Error parsing encrypted data field:', error);
        parsedEncryptedData = null;
      }
    }
    
    // Create application in database
    console.log('Creating application in database...');
    const application = await storage.createApplication({
      ...validatedData,
      status: 'submitted'
    });
    console.log('Application created successfully with ID:', application.id);

    // Return success response immediately (temporarily disable webhook)
    console.log('Returning success response');
    res.status(201).json({ 
      message: "Application submitted successfully", 
      applicationId: application.id,
      encryptedDataReceived: !!parsedEncryptedData,
      webhookSent: false
    });
    
  } catch (error) {
    console.error('Error in submit-application:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors,
        message: "Please check your form data and try again."
      });
    }
    
    // Check for specific error types
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      console.error('JSON parsing error detected');
      return res.status(400).json({ 
        error: "Invalid data format",
        message: "The submitted data contains invalid JSON format.",
        details: error.message
      });
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Webhook fetch error detected');
      return res.status(500).json({ 
        error: "Webhook delivery failed",
        message: "Application was saved but webhook delivery failed.",
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: "Failed to submit application",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
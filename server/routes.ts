import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRentalApplicationSchema } from "@shared/schema";
import { z } from "zod";
import CryptoJS from "crypto-js";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all applications
  app.get("/api/applications", async (req, res) => {
    try {
      const applications = await storage.getAllApplications();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Get single application
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
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  // Create new application
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
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  // Update application
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
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  // Submit application (change status to submitted)
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
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // Submit application with webhook integration
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
      if (validatedData.encryptedData) {
        try {
          parsedEncryptedData = JSON.parse(validatedData.encryptedData);
          console.log('Parsed encrypted data:', JSON.stringify(parsedEncryptedData, null, 2));
        } catch (error) {
          console.error('Error parsing encrypted data field:', error);
        }
      }
      
      // Store application in database
      console.log('Storing application in database...');
      const application = await storage.createApplication({
        ...validatedData,
        status: 'submitted'
      });
      console.log('Application stored successfully:', application);

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
          submittedAt: new Date().toISOString()
        },
        files: files || [],
        documentsFiles: parsedFiles || [],
        signatures: signatures || {},
        encryptedData: {
          raw: encryptedData || {},
          parsed: parsedEncryptedData || null
        },
        metadata: {
          source: 'rental-application-system',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }
      };

      // Send to Make.com webhook
      try {
        console.log('Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
        
        const webhookResponse = await fetch('https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
          const errorText = await webhookResponse.text();
          console.error('Webhook error response:', errorText);
          // Continue with submission even if webhook fails
        } else {
          console.log('Webhook sent successfully');
          const responseText = await webhookResponse.text();
          console.log('Webhook response:', responseText);
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
        // Continue with submission even if webhook fails
      }

      res.status(201).json({ 
        message: "Application submitted successfully", 
        application,
        webhookSent: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error('Application submission error:', error);
      res.status(500).json({ error: "Failed to submit application" });
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
      
      // Store application in database
      console.log('Storing loan application in database...');
      const application = await storage.createApplication({
        ...validatedData,
        status: 'submitted'
      });
      console.log('Loan application stored successfully:', application);

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
        application,
        loanWebhookSent: true,
        loanData: loanApplicationData
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error('Loan application submission error:', error);
      res.status(500).json({ error: "Failed to submit loan application" });
    }
  });

  // Upload encrypted files
  app.post("/api/upload-files", async (req, res) => {
    try {
      const { files, applicationId } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: "No files provided" });
      }

      const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-change-in-production';
      const uploadDir = path.join(process.cwd(), 'uploads');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uploadedFiles = [];

      for (const encryptedFile of files) {
        try {
          // Decrypt the file
          const bytes = CryptoJS.AES.decrypt(encryptedFile.encryptedData, secretKey);
          const base64Str = bytes.toString(CryptoJS.enc.Utf8);
          const fileBuffer = Buffer.from(base64Str, 'base64');

          // Generate unique filename
          const timestamp = Date.now();
          const safeFilename = encryptedFile.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${timestamp}_${safeFilename}`;
          const filePath = path.join(uploadDir, filename);

          // Save the decrypted file
          fs.writeFileSync(filePath, fileBuffer);

          uploadedFiles.push({
            originalName: encryptedFile.filename,
            savedName: filename,
            size: encryptedFile.originalSize,
            mimeType: encryptedFile.mimeType,
            uploadDate: encryptedFile.uploadDate,
            path: filePath
          });

        } catch (decryptError) {
          console.error(`Failed to decrypt file ${encryptedFile.filename}:`, decryptError);
          return res.status(400).json({ 
            error: `Failed to decrypt file ${encryptedFile.filename}` 
          });
        }
      }

      // Store file metadata in database (you can extend your schema to include this)
      // await storage.saveFileMetadata(applicationId, uploadedFiles);

      res.json({ 
        message: "Files uploaded successfully", 
        files: uploadedFiles,
        count: uploadedFiles.length
      });

    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

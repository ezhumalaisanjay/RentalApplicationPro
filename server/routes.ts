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

      res.status(201).json({ 
        message: "Application submitted successfully", 
        application
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



  // Monday.com API proxy endpoint
  app.get("/api/monday/units", async (req, res) => {
    try {
      const MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzOTcyMTg4NCwiYWFpIjoxMSwidWlkIjo3ODE3NzU4NCwiaWFkIjoiMjAyNS0wNy0xNlQxMjowMDowOC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NTUxNjQ0NSwicmduIjoidXNlMSJ9.s43_kjRmv-QaZ92LYdRlEvrq9CYqxKhh3XXpR-8nhKU";
      const BOARD_ID = "8740450373";

      const query = `
        query {
          boards(ids: [${BOARD_ID}]) {
            items_page(query_params: {
              rules: [
                { column_id: "color_mkp7fmq4", compare_value: "Vacant", operator: contains_terms }
              ]
            }) {
              items {
                id
                name
                column_values(ids: ["color_mkp7xdce", "color_mkp77nrv", "color_mkp7fmq4"]) {
                  id
                  text
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_TOKEN,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Monday API error: ${response.status}`);
      }

      const result = await response.json();
      const items = result?.data?.boards?.[0]?.items_page?.items ?? [];

      const units = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        propertyName: item.column_values.find((c: any) => c.id === "color_mkp7xdce")?.text || "",
        unitType: item.column_values.find((c: any) => c.id === "color_mkp77nrv")?.text || "",
        status: item.column_values.find((c: any) => c.id === "color_mkp7fmq4")?.text || ""
      }));

      res.json({ units });
    } catch (error) {
      console.error('Monday API proxy error:', error);
      res.status(500).json({ error: "Failed to fetch units from Monday.com" });
    }
  });

  // Monday.com missing subitems endpoint
  app.get("/api/monday/missing-subitems/:applicantId", async (req, res) => {
    try {
      const { applicantId } = req.params;
      
      if (!applicantId) {
        return res.status(400).json({ error: 'Applicant ID is required' });
      }

      console.log('Searching for applicant ID:', applicantId);

      const MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzOTcyMTg4NCwiYWFpIjoxMSwidWlkIjo3ODE3NzU4NCwiaWFkIjoiMjAyNS0wNy0xNlQxMjowMDowOC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NTUxNjQ0NSwicmduIjoidXNlMSJ9.s43_kjRmv-QaZ92LYdRlEvrq9CYqxKhh3XXpR-8nhKU";
      const BOARD_ID = "9602025981";

      const query = `
        query {
          boards(ids: [${BOARD_ID}]) {
            items_page {
              items {
                id
                name
                column_values(ids: ["text_mksxyax3"]) {
                  id
                  text
                }
                subitems {
                  id
                  name
                  column_values(ids: ["status", "color_mksyqx5h"]) {
                    id
                    text
                    ... on StatusValue {
                      label
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_TOKEN,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Monday API error: ${response.status}`);
      }

      const result = await response.json();
      const items = result?.data?.boards?.[0]?.items_page?.items ?? [];
      
      console.log('📊 Found', items.length, 'total items in the board');
      
      // Debug: Log all column values for first item to see available columns
      if (items.length > 0) {
        console.log('🔍 Debug: Column values for first item:');
        items[0].column_values.forEach((cv: any) => {
          console.log(`  - Column ${cv.id}: ${cv.text}`);
        });
        
        if (items[0].subitems && items[0].subitems.length > 0) {
          console.log('🔍 Debug: Column values for first subitem:');
          items[0].subitems[0].column_values.forEach((cv: any) => {
            console.log(`  - Column ${cv.id}: ${cv.text} (label: ${cv.label || 'N/A'})`);
          });
        }
      }
      
      // Find items matching the applicant ID
      const matchingItems = items.filter((item: any) => {
        const itemApplicantId = item.column_values.find((cv: any) => cv.id === "text_mksxyax3")?.text;
        return itemApplicantId === applicantId;
      });

      console.log('📊 Found', matchingItems.length, 'items matching applicant ID', `"${applicantId}"`);

      const results = [];

      for (const item of matchingItems) {
        const parentItemId = item.id;
        const parentItemName = item.name;
        
        const subitems = item.subitems || [];

        for (const sub of subitems) {
          const statusValue = sub.column_values.find((cv: any) => cv.id === "status");
          const status = statusValue?.label || statusValue?.text;
          const applicantType = sub.column_values.find((cv: any) => cv.id === "color_mksyqx5h")?.text || "Unknown";
          
          if (status === "Missing") {
            results.push({
              id: sub.id,
              name: sub.name,
              status,
              parentItemId,
              parentItemName,
              applicantType
            });
          }
        }
      }

      console.log('✅ Final Results:', results.length, 'missing subitems found');
      res.json(results);

    } catch (error) {
      console.error('Monday API proxy error:', error);
      res.status(500).json({ 
        error: "Failed to fetch missing subitems from Monday.com",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
          // Get the raw bytes directly instead of converting to UTF-8 string
          const base64Str = bytes.toString(CryptoJS.enc.Base64);
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

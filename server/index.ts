import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { insertRentalApplicationSchema } from "../shared/schema";
import crypto from "crypto";

const app = express();

// Increase payload limits for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log request size for debugging
  if (path.startsWith("/api")) {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeInMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
      log(`Request size: ${sizeInMB}MB for ${req.method} ${path}`);
    }
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes from Netlify functions
app.post('/api/submit-application', async (req, res) => {
  try {
    log('=== SUBMIT-APPLICATION ENDPOINT CALLED ===');
    log('Request URL:', req.url);
    log('Request method:', req.method);
    log('Request headers:', JSON.stringify(req.headers, null, 2));

    // Check payload size
    const contentLength = req.headers['content-length'];
    const payloadSizeMB = contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) : 'unknown';
    log(`Payload size: ${payloadSizeMB}MB`);

    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      log('Very large payload detected - using simplified approach');
      return res.status(413).json({ 
        error: 'Payload too large', 
        message: 'Request payload exceeds 5MB limit. Please upload large files separately.',
        payloadSizeMB: parseFloat(payloadSizeMB)
      });
    }

    const { applicationData, files, encryptedData } = req.body;

    if (!applicationData) {
      return res.status(400).json({ error: 'Missing application data' });
    }

    // Validate application data
    const validatedData = insertRentalApplicationSchema.parse(applicationData);

    // Create application in database
    const result = await storage.createApplication({
      ...validatedData,
      files: files || [],
      encryptedData: encryptedData || null
    });

    // Send webhook
    if (process.env.WEBHOOK_URL) {
      const webhookPayload = {
        type: 'rental_application_submitted',
        applicationId: result.application.id,
        timestamp: new Date().toISOString(),
        data: {
          application: result.application,
          files: files ? files.length : 0,
          hasEncryptedData: !!encryptedData
        }
      };

      try {
        const webhookResponse = await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          log('Webhook sent successfully');
        } else {
          log('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
        }
      } catch (webhookError) {
        log('Webhook error:', webhookError);
      }
    }

    res.json({
      success: true,
      applicationId: result.application.id,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    log('Submit application error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/upload-files', async (req, res) => {
  try {
    log('=== UPLOAD-FILES ENDPOINT CALLED ===');
    
    const { files, personType } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Invalid files data' });
    }

    if (!personType) {
      return res.status(400).json({ error: 'Missing person type' });
    }

    // Process uploaded files
    const processedFiles = files.map((file: any) => ({
      ...file,
      personType,
      uploadedAt: new Date().toISOString()
    }));

    // Send webhook for file upload
    if (process.env.WEBHOOK_URL) {
      const webhookPayload = {
        type: 'files_uploaded',
        personType,
        timestamp: new Date().toISOString(),
        data: {
          files: processedFiles,
          fileCount: processedFiles.length
        }
      };

      try {
        const webhookResponse = await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          log('File upload webhook sent successfully');
        } else {
          log('File upload webhook failed:', webhookResponse.status);
        }
      } catch (webhookError) {
        log('File upload webhook error:', webhookError);
      }
    }

    res.json({
      success: true,
      files: processedFiles,
      message: `Files uploaded successfully for ${personType}`
    });

  } catch (error) {
    log('Upload files error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/submit-webhook-only', async (req, res) => {
  try {
    log('=== SUBMIT-WEBHOOK-ONLY ENDPOINT CALLED ===');
    
    const { applicationData, encryptedData } = req.body;

    if (!applicationData) {
      return res.status(400).json({ error: 'Missing application data' });
    }

    // Send webhook with full data
    if (process.env.WEBHOOK_URL) {
      const webhookPayload = {
        type: 'rental_application_webhook_only',
        timestamp: new Date().toISOString(),
        data: {
          application: applicationData,
          encryptedData: encryptedData || null
        }
      };

      try {
        const webhookResponse = await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          log('Webhook-only submission successful');
          res.json({ success: true, message: 'Webhook sent successfully' });
        } else {
          log('Webhook-only submission failed:', webhookResponse.status);
          res.status(webhookResponse.status).json({ 
            error: 'Webhook failed',
            status: webhookResponse.status
          });
        }
      } catch (webhookError) {
        log('Webhook-only error:', webhookError);
        res.status(500).json({ error: 'Webhook error' });
      }
    } else {
      res.status(400).json({ error: 'No webhook URL configured' });
    }

  } catch (error) {
    log('Submit webhook-only error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log specific payload size errors
    if (status === 413) {
      log(`Payload too large error: ${message}`);
      log(`Error details: ${JSON.stringify(err)}`);
    }

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 5000, or use a different port if 5000 is busy
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0", // Changed from localhost to 0.0.0.0 for Render
  }, () => {
    log(`serving on port ${port}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`Port ${port} is busy, trying port ${port + 1}`);
      server.listen({
        port: port + 1,
        host: "0.0.0.0", // Changed from localhost to 0.0.0.0 for Render
      }, () => {
        log(`serving on port ${port + 1}`);
      });
    } else {
      throw err;
    }
  });
})();

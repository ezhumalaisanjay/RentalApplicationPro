# Webhook Setup Guide

## Quick Fix: Use a Test Webhook URL

### Option 1: HTTPBin (Immediate Fix)
Set this in your Render environment variables:
```
WEBHOOK_URL=https://httpbin.org/post
```

This will immediately fix the 404 error and show you the webhook data.

### Option 2: Webhook.site (Recommended for Testing)
1. Go to [webhook.site](https://webhook.site)
2. Copy the unique URL provided
3. Set it as your `WEBHOOK_URL` in Render

### Option 3: Make.com (Production Ready)

#### Step 1: Create Make.com Account
1. Go to [Make.com](https://www.make.com)
2. Sign up for a free account
3. Create a new scenario

#### Step 2: Add Webhook Trigger
1. Click "Add a module"
2. Search for "Webhooks"
3. Select "Webhooks" → "Custom webhook"
4. Click "Add"
5. Copy the webhook URL

#### Step 3: Configure Webhook
1. Set the webhook to accept JSON data
2. Save the scenario
3. Copy the webhook URL

#### Step 4: Add to Render
1. Go to your Render dashboard
2. Go to Environment variables
3. Set `WEBHOOK_URL` to your Make.com webhook URL

### Option 4: Zapier (Alternative)
1. Go to [Zapier.com](https://zapier.com)
2. Create a new Zap
3. Add "Webhooks by Zapier" as trigger
4. Copy the webhook URL

## Environment Variable Format

In your Render dashboard, set:
```
WEBHOOK_URL=https://your-webhook-url-here
```

## Test Your Webhook

After setting the webhook URL:

1. **Submit a test application** on your rental form
2. **Check the webhook service** to see if data was received
3. **Check Render logs** for webhook success/failure messages

## Webhook Data Format

Your webhook will receive data in this format:
```json
{
  "type": "rental_application_webhook_only",
  "timestamp": "2024-01-15T10:58:01.000Z",
  "payloadSizeMB": "25.71",
  "data": {
    "applicationSummary": {
      "buildingAddress": "123 Main St",
      "apartmentNumber": "5A",
      "monthlyRent": 2000,
      "applicantName": "John Doe",
      "coApplicantName": "Jane Doe",
      "hasGuarantor": true,
      "guarantorName": "Bob Smith",
      "submittedAt": "2024-01-15T10:58:01.000Z"
    },
    "encryptedDataSummary": {
      "hasEncryptedData": true,
      "documentTypes": ["paystubs", "bankStatements"],
      "totalFiles": 5,
      "dataSize": "large"
    }
  }
}
```

## Troubleshooting

### 404 Error
- Check that the webhook URL is correct
- Make sure the webhook service is active
- Try the HTTPBin test URL first

### 413 Error
- The webhook payload is now optimized and should not cause 413 errors
- If you still get 413, the webhook service has very low limits

### Timeout Error
- Some webhook services have timeout limits
- The optimized payload should prevent timeouts

## Recommended Setup

1. **Start with HTTPBin:** `https://httpbin.org/post`
2. **Test with Webhook.site** for detailed inspection
3. **Move to Make.com** for production use

## Remove Webhook (Optional)

If you don't want webhook notifications:
1. Go to Render dashboard
2. Delete the `WEBHOOK_URL` environment variable
3. Redeploy your application 
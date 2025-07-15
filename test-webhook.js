#!/usr/bin/env node

// Test script to verify webhook functionality
import fetch from 'node-fetch';

const testWebhooks = [
  'https://httpbin.org/post',
  'https://webhook.site/your-unique-url', // Replace with your webhook.site URL
  'https://hook.us1.make.com/your-make-webhook-url' // Replace with your Make.com URL
];

async function testWebhook(webhookUrl) {
  console.log(`\n🧪 Testing webhook: ${webhookUrl}`);
  
  const testPayload = {
    type: 'rental_application_webhook_only',
    timestamp: new Date().toISOString(),
    payloadSizeMB: '0.001',
    data: {
      applicationSummary: {
        buildingAddress: '123 Test St',
        apartmentNumber: '1A',
        monthlyRent: 1500,
        applicantName: 'Test User',
        submittedAt: new Date().toISOString()
      },
      encryptedDataSummary: {
        hasEncryptedData: false
      }
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`📨 Response: ${responseText.substring(0, 200)}...`);
    } else {
      console.log(`❌ Error: ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting webhook tests...\n');
  
  for (const webhookUrl of testWebhooks) {
    if (webhookUrl.includes('your-')) {
      console.log(`⏭️  Skipping placeholder URL: ${webhookUrl}`);
      continue;
    }
    await testWebhook(webhookUrl);
  }
  
  console.log('\n✨ Webhook tests completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Copy a working webhook URL');
  console.log('2. Set it as WEBHOOK_URL in your Render environment variables');
  console.log('3. Redeploy your application');
  console.log('4. Test with a real rental application submission');
}

// Run the tests
runTests().catch(console.error); 
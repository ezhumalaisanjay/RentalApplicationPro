// Test script for the loan application webhook
// This demonstrates how to send data to the new /api/submit-loan-application endpoint

// Sample rental application data that will be converted to loan application format
const sampleRentalApplication = {
  applicationData: {
    buildingAddress: "5089 & 5099 Broadway, New York, NY 10034",
    apartmentNumber: "Apt 5B",
    moveInDate: "2025-08-01",
    monthlyRent: 4000,
    apartmentType: "2 Bedroom",
    howDidYouHear: "Online Search",
    
    // Primary Applicant
    applicantName: "John Smith",
    applicantDob: "1985-03-15",
    applicantPhone: "555-123-4567",
    applicantEmail: "john.smith@email.com",
    applicantAddress: "123 Main St",
    applicantCity: "New York",
    applicantState: "NY",
    applicantZip: "10001",
    
    // Co-Applicant
    hasCoApplicant: true,
    coApplicantName: "Jane Smith",
    coApplicantPhone: "555-987-6543",
    coApplicantEmail: "jane.smith@email.com",
    
    // Guarantor
    hasGuarantor: false,
    guarantorName: "",
    guarantorPhone: "",
    guarantorEmail: "",
    
    // Financial Information
    employmentStatus: "Employed",
    employerName: "Tech Corp",
    jobTitle: "Software Engineer",
    monthlyIncome: 8000,
    
    // Documents and signatures will be handled separately
    documents: JSON.stringify([]),
    encryptedData: null
  },
  files: [],
  signatures: {},
  encryptedData: null
};

// Function to test the loan application webhook
async function testLoanWebhook() {
  try {
    console.log('Testing loan application webhook...');
    console.log('Sample data:', JSON.stringify(sampleRentalApplication, null, 2));
    
    const response = await fetch('http://localhost:5000/api/submit-loan-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleRentalApplication)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook test failed:', response.status, response.statusText);
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Loan application webhook test successful!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.loanData) {
      console.log('\n📋 Loan Application Data Sent to Make.com:');
      console.log(JSON.stringify(result.loanData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
  }
}

// Function to test the original rental application webhook
async function testRentalWebhook() {
  try {
    console.log('\nTesting rental application webhook...');
    
    const response = await fetch('http://localhost:5000/api/submit-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleRentalApplication)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Rental webhook test failed:', response.status, response.statusText);
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Rental application webhook test successful!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Rental webhook test failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = (await import('node-fetch')).default;
  
  console.log('🚀 Starting webhook tests...\n');
  
  // Test both webhooks
  await testLoanWebhook();
  await testRentalWebhook();
  
  console.log('\n✨ Webhook tests completed!');
} else {
  // Browser environment
  console.log('🌐 Browser environment detected');
  console.log('To test the webhooks, run this script in Node.js or use the browser console');
  
  // Make functions available globally for browser testing
  window.testLoanWebhook = testLoanWebhook;
  window.testRentalWebhook = testRentalWebhook;
  window.sampleRentalApplication = sampleRentalApplication;
  
  console.log('Functions available:');
  console.log('- testLoanWebhook()');
  console.log('- testRentalWebhook()');
  console.log('- sampleRentalApplication (data)');
} 
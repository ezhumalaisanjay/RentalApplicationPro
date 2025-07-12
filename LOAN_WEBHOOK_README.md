# Loan Application Webhook Integration

This document describes the new loan application webhook functionality that converts rental application data into the loan application format required by your Make.com workflow.

## Overview

The system now supports two webhook endpoints:

1. **`/api/submit-application`** - Original rental application webhook
2. **`/api/submit-loan-application`** - New loan application webhook (converts rental data to loan format)

## Loan Application Data Format

The loan application webhook converts rental application data into the following format:

```json
[
  {
    "From": "applicant@email.com",
    "Subject": "Loan Application - John Smith - 5089 & 5099 Broadway, New York, NY 10034",
    "Received Date": "2025-07-11T13:04:54Z",
    "Recipients": ["loans@castellancapital.com"],
    "Loan Amount Requested": 1440000,
    "Loan Type": "Acquisition",
    "Property Type": "Mixed Use",
    "Property Address": "5089 & 5099 Broadway, New York, NY 10034",
    "Gross square feet (SF) [GSF]": "",
    "Net Square feet [NSF]": "",
    "Purchase Price of the Property": 2400000,
    "Number of Residential Units": 1,
    "Number of Commercial Units": 0,
    "Loan to value (LTV) [LTPP] %": "",
    "Loan to cost (LTC) %": "55-60",
    "Net Operating Income (NOI)": "",
    "Applicant Name": "John Smith",
    "Applicant Phone": "555-123-4567",
    "Applicant Email": "john.smith@email.com",
    "Monthly Rent": 4000,
    "Apartment Type": "2 Bedroom",
    "Move In Date": "2025-08-01",
    "Co-Applicant Name": "Jane Smith",
    "Co-Applicant Email": "jane.smith@email.com",
    "Guarantor Name": "",
    "Guarantor Email": "",
    "Application ID": "app_123456",
    "Application Status": "submitted",
    "Submitted At": "2025-07-11T13:04:54Z"
  }
]
```

## Data Conversion Logic

### Loan Amount Calculation
- **Formula**: `Monthly Rent × 12 × 30`
- **Example**: $4,000/month → $1,440,000 loan amount
- **Rationale**: 30x annual rent as a conservative loan amount

### Purchase Price Calculation
- **Formula**: `Loan Amount × 1.67`
- **Example**: $1,440,000 loan → $2,400,000 purchase price
- **Rationale**: Assumes 60% LTV ratio

### Default Values
- **Loan Type**: "Acquisition"
- **Property Type**: "Mixed Use"
- **Number of Residential Units**: 1
- **Number of Commercial Units**: 0
- **Loan to Cost (LTC)**: "55-60"

## API Endpoints

### 1. Loan Application Submission
```http
POST /api/submit-loan-application
Content-Type: application/json

{
  "applicationData": {
    "buildingAddress": "5089 & 5099 Broadway, New York, NY 10034",
    "apartmentNumber": "Apt 5B",
    "moveInDate": "2025-08-01",
    "monthlyRent": 4000,
    "apartmentType": "2 Bedroom",
    "applicantName": "John Smith",
    "applicantEmail": "john.smith@email.com",
    "applicantPhone": "555-123-4567",
    // ... other rental application fields
  },
  "files": [],
  "signatures": {},
  "encryptedData": null
}
```

### 2. Response Format
```json
{
  "message": "Loan application submitted successfully",
  "application": {
    "id": "app_123456",
    // ... application details
  },
  "loanWebhookSent": true,
  "loanData": [
    {
      // ... converted loan application data
    }
  ]
}
```

## Webhook Configuration

### Make.com Webhook URL
- **Loan Applications**: `https://hook.us1.make.com/37yhndnke102glc74y0nx58tsb7n2n86`
- **Rental Applications**: `https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk`

### Environment Variables
```bash
# For Netlify deployment
WEBHOOK_URL=https://hook.us1.make.com/37yhndnke102glc74y0nx58tsb7n2n86
```

## Testing

### Using the Test Script
```bash
# Run the test script
node test-loan-webhook.js
```

### Manual Testing with curl
```bash
curl -X POST http://localhost:5000/api/submit-loan-application \
  -H "Content-Type: application/json" \
  -d @sample-loan-data.json
```

### Browser Console Testing
```javascript
// Load the test script in browser
// Then run:
testLoanWebhook();
testRentalWebhook();
```

## Integration with Frontend

To use the loan application webhook from your React frontend:

```javascript
const submitLoanApplication = async (applicationData) => {
  try {
    const response = await fetch('/api/submit-loan-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationData,
        files: uploadedFiles,
        signatures: signatures,
        encryptedData: encryptedData
      })
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Loan application submitted:', result);
    
    // Show success message
    toast({
      title: "Loan Application Submitted",
      description: "Your loan application has been submitted successfully.",
    });
    
  } catch (error) {
    console.error('Loan application error:', error);
    toast({
      title: "Submission Failed",
      description: "Failed to submit loan application. Please try again.",
      variant: "destructive"
    });
  }
};
```

## Error Handling

The webhook system includes comprehensive error handling:

1. **Validation Errors**: Returns 400 with detailed validation messages
2. **Database Errors**: Returns 500 with error details
3. **Webhook Failures**: Logs errors but continues with application submission
4. **Network Errors**: Graceful degradation with error logging

## Monitoring and Logging

All webhook activities are logged with:
- Request payload details
- Response status and content
- Error messages and stack traces
- Success confirmations

## Security Considerations

1. **Data Validation**: All input data is validated using Zod schemas
2. **Encryption**: Sensitive data can be encrypted before transmission
3. **HTTPS**: All webhook communications use HTTPS
4. **Rate Limiting**: Consider implementing rate limiting for production

## Customization

### Modifying Loan Calculations
Edit the conversion logic in `server/routes.ts`:

```javascript
// Customize loan amount calculation
"Loan Amount Requested": application.monthlyRent ? 
  application.monthlyRent * 12 * 25 : 0, // Change multiplier

// Customize purchase price calculation  
"Purchase Price of the Property": application.monthlyRent ? 
  application.monthlyRent * 12 * 25 * 1.5 : 0, // Change multiplier
```

### Adding Custom Fields
Add new fields to the loan application data structure:

```javascript
const loanApplicationData = [
  {
    // ... existing fields
    "Custom Field": "Custom Value",
    "Additional Info": application.customField || ""
  }
];
```

## Support

For questions or issues with the loan application webhook:

1. Check the server logs for detailed error messages
2. Verify the webhook URL is correct and accessible
3. Test with the provided test script
4. Review the Make.com webhook configuration

## Changelog

- **v1.0.0**: Initial implementation of loan application webhook
- Added data conversion from rental to loan format
- Integrated with existing Make.com workflow
- Added comprehensive error handling and logging 
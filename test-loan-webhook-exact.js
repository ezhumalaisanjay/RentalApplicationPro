// Test script using the exact JSON format provided
// Using built-in fetch (available in Node.js 18+)

// JSON data in the exact format provided
const data = [
    {
        "From": "gseelan@castellanre.com",
        "Subject": "Test Email - 3 for Monday Board",
        "Received Date": "2025-07-11T13:04:54Z",
        "Recipients": [
            "loans@castellancapital.com"
        ],
        "Loan Amount Requested": 4800000,
        "Loan Type": "Acquisition",
        "Property Type": "Mixed Use",
        "Property Address": "5089 & 5099 Broadway, New York, NY 10034",
        "Gross square feet (SF) [GSF]": "",
        "Net Square feet [NSF]": "",
        "Purchase Price of the Property": 8000000,
        "Number of Residential Units": 84,
        "Number of Commercial Units": 1,
        "Loan to value (LTV) [LTPP] %": "",
        "Loan to cost (LTC) %": "55-60",
        "Net Operating Income (NOI)": ""
    }
];

// Webhook URL
const webhook_url = "https://hook.us1.make.com/37yhndnke102glc74y0nx58tsb7n2n86";

// Send POST request
async function testWebhook() {
    try {
        console.log('Sending data to webhook...');
        console.log('Data:', JSON.stringify(data, null, 2));
        
        const response = await fetch(webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        console.log('Response status text:', response.statusText);
        
        if (response.ok) {
            const responseText = await response.text();
            console.log("✅ Data sent successfully!");
            console.log("Response:", responseText);
        } else {
            const errorText = await response.text();
            console.log("❌ Failed to send data.");
            console.log("Error status:", response.status);
            console.log("Error response:", errorText);
        }
    } catch (error) {
        console.log("❌ Failed to send data.");
        console.log("Error:", error.message);
    }
}

// Test the webhook
testWebhook(); 
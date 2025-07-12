import json
import requests
from datetime import datetime

# Test data for rental application webhook
def test_rental_application_webhook():
    """Test the rental application webhook with sample data"""
    
    # Sample rental application data
    rental_data = {
        "application": {
            "id": 123,
            "buildingAddress": "5089 & 5099 Broadway, New York, NY 10034",
            "apartmentNumber": "Apt 1",
            "moveInDate": "2025-08-01T00:00:00.000Z",
            "monthlyRent": 4000,
            "apartmentType": "2 Bedroom",
            "howDidYouHear": "Online Search",
            # Primary Applicant
            "applicantName": "John Doe",
            "applicantDob": "1990-01-01T00:00:00.000Z",
            "applicantPhone": "+1-555-123-4567",
            "applicantEmail": "john.doe@example.com",
            "applicantAddress": "123 Main St, New York, NY 10001",
            "applicantCity": "New York",
            "applicantState": "NY",
            "applicantZip": "10001",
            # Co-Applicant
            "hasCoApplicant": True,
            "coApplicantName": "Jane Doe",
            "coApplicantPhone": "+1-555-987-6543",
            "coApplicantEmail": "jane.doe@example.com",
            # Guarantor
            "hasGuarantor": False,
            "guarantorName": None,
            "guarantorPhone": None,
            "guarantorEmail": None,
            "status": "submitted",
            "submittedAt": datetime.now().isoformat()
        },
        "files": [
            {
                "originalName": "paystub.pdf",
                "savedName": "1234567890_paystub.pdf",
                "size": 1024000,
                "mimeType": "application/pdf",
                "uploadDate": datetime.now().isoformat()
            }
        ],
        "documentsFiles": [
            {
                "type": "paystubs",
                "files": ["1234567890_paystub.pdf"]
            }
        ],
        "signatures": {
            "applicant": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "coApplicant": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        },
        "encryptedData": {
            "raw": {
                "documents": {
                    "applicant": {
                        "paystubs": ["encrypted_file_1"],
                        "bankStatements": ["encrypted_file_2"]
                    }
                },
                "allEncryptedFiles": ["encrypted_file_1", "encrypted_file_2"],
                "encryptionTimestamp": datetime.now().isoformat(),
                "encryptionVersion": "1.0.0"
            },
            "parsed": {
                "documents": {
                    "applicant": {
                        "paystubs": ["encrypted_file_1"],
                        "bankStatements": ["encrypted_file_2"]
                    }
                },
                "allEncryptedFiles": ["encrypted_file_1", "encrypted_file_2"],
                "encryptionTimestamp": datetime.now().isoformat(),
                "encryptionVersion": "1.0.0"
            }
        },
        "metadata": {
            "source": "rental-application-system",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }
    }

    # Webhook URL for rental applications
    webhook_url = "https://hook.us1.make.com/og5ih0pl1br72r1pko39iimh3hdl31hk"

    # Send POST request
    try:
        response = requests.post(webhook_url, json=rental_data)
        response.raise_for_status()
        print("✅ Rental application webhook sent successfully!")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send rental application webhook: {str(e)}")
        return False

def test_loan_application_webhook():
    """Test the loan application webhook with sample data"""
    
    # Sample loan application data (format for Make.com)
    loan_data = [
        {
            "From": "john.doe@example.com",
            "Subject": "Loan Application - John Doe - 5089 & 5099 Broadway, New York, NY 10034",
            "Received Date": datetime.now().isoformat(),
            "Recipients": ["loans@castellancapital.com"],
            "Loan Amount Requested": 4800000,  # 30x annual rent
            "Loan Type": "Acquisition",
            "Property Type": "Mixed Use",
            "Property Address": "5089 & 5099 Broadway, New York, NY 10034",
            "Gross square feet (SF) [GSF]": "",
            "Net Square feet [NSF]": "",
            "Purchase Price of the Property": 8000000,  # Estimate based on loan amount
            "Number of Residential Units": 84,
            "Number of Commercial Units": 1,
            "Loan to value (LTV) [LTPP] %": "",
            "Loan to cost (LTC) %": "55-60",
            "Net Operating Income (NOI)": "",
            # Additional fields from rental application
            "Applicant Name": "John Doe",
            "Applicant Phone": "+1-555-123-4567",
            "Applicant Email": "john.doe@example.com",
            "Monthly Rent": 4000,
            "Apartment Type": "2 Bedroom",
            "Move In Date": "2025-08-01T00:00:00.000Z",
            "Co-Applicant Name": "Jane Doe",
            "Co-Applicant Email": "jane.doe@example.com",
            "Guarantor Name": "",
            "Guarantor Email": "",
            "Application ID": 123,
            "Application Status": "submitted",
            "Submitted At": datetime.now().isoformat()
        }
    ]

    # Webhook URL for loan applications
    webhook_url = "https://hook.us1.make.com/37yhndnke102glc74y0nx58tsb7n2n86"

    # Send POST request
    try:
        response = requests.post(webhook_url, json=loan_data)
        response.raise_for_status()
        print("✅ Loan application webhook sent successfully!")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send loan application webhook: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Webhook Integration")
    print("=" * 50)
    
    # Test rental application webhook
    print("\n📋 Testing Rental Application Webhook...")
    rental_success = test_rental_application_webhook()
    
    # Test loan application webhook
    print("\n💰 Testing Loan Application Webhook...")
    loan_success = test_loan_application_webhook()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"Rental Application Webhook: {'✅ PASS' if rental_success else '❌ FAIL'}")
    print(f"Loan Application Webhook: {'✅ PASS' if loan_success else '❌ FAIL'}")
    
    if rental_success and loan_success:
        print("\n🎉 All webhook tests passed!")
    else:
        print("\n⚠️ Some webhook tests failed. Check the error messages above.") 
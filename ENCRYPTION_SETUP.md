# File Upload Encryption Setup

This application now supports encrypted file uploads using AES encryption. Files are converted to Base64 and encrypted before being sent to the server.

## 🔐 How It Works

1. **Frontend**: Files are converted to Base64 and encrypted using crypto-js
2. **Backend**: Files are decrypted and saved to the uploads directory
3. **Security**: All file data is encrypted in transit and at rest

## 🛠️ Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Encryption key for file uploads (change this in production!)
ENCRYPTION_KEY=your-secret-key-change-in-production

# React app encryption key (for frontend)
REACT_APP_ENCRYPTION_KEY=your-secret-key-change-in-production
```

### 2. Uploads Directory

The server will automatically create an `uploads/` directory in the project root when files are uploaded.

### 3. Security Notes

- **Change the encryption key** in production
- Use a strong, randomly generated key
- Store the key securely (not in version control)
- Consider using environment-specific keys

## 📁 File Structure

```
uploads/
├── 1234567890_document1.pdf
├── 1234567891_document2.jpg
└── ...
```

## 🔧 API Endpoints

### POST /api/upload-files

Uploads encrypted files to the server.

**Request Body:**
```json
{
  "files": [
    {
      "encryptedData": "encrypted_base64_string",
      "filename": "document.pdf",
      "originalSize": 1024000,
      "mimeType": "application/pdf",
      "uploadDate": "2024-01-01T00:00:00.000Z"
    }
  ],
  "applicationId": 123
}
```

**Response:**
```json
{
  "message": "Files uploaded successfully",
  "files": [
    {
      "originalName": "document.pdf",
      "savedName": "1234567890_document.pdf",
      "size": 1024000,
      "mimeType": "application/pdf",
      "uploadDate": "2024-01-01T00:00:00.000Z",
      "path": "/path/to/uploads/1234567890_document.pdf"
    }
  ],
  "count": 1
}
```

## 🚀 Usage

The encryption is automatically enabled for all file uploads in the Supporting Documents section. Users will see a shield icon indicating that files are being encrypted.

## 🔒 Security Features

- **AES Encryption**: Industry-standard encryption algorithm
- **Base64 Encoding**: Ensures safe transmission of binary data
- **Unique Filenames**: Prevents filename conflicts
- **File Validation**: Size and type restrictions
- **Error Handling**: Graceful failure handling

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to resolve import crypto-js"**
   - Run `npm install crypto-js @types/crypto-js`

2. **"Failed to decrypt file"**
   - Check that encryption keys match between frontend and backend
   - Verify environment variables are set correctly

3. **"Uploads directory not found"**
   - The server will create the directory automatically
   - Check file permissions if issues persist

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

## 📝 Notes

- Files are encrypted client-side before upload
- Server decrypts files before saving
- Original filenames are preserved in metadata
- File size increases by ~33% due to Base64 encoding
- Maximum file size: 10MB per file
- Supported formats: JPG, JPEG, PNG, PDF 
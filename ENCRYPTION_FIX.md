# File Encryption Fix

## Issue Description

The application was experiencing a "Malformed UTF-8 data" error when trying to decrypt uploaded files. This error occurred because the decryption process was incorrectly trying to convert binary data (like PDFs) to UTF-8 strings.

## Root Cause

The issue was in the decryption logic in three files:

1. `netlify/functions/api.js`
2. `server/routes.ts` 
3. `client/src/lib/file-encryption.ts`

The code was using:
```javascript
const base64Str = bytes.toString(CryptoJS.enc.Utf8);
```

This is incorrect for binary files because:
- Binary data (PDFs, images) contains non-UTF-8 bytes
- Converting binary data to UTF-8 strings can cause corruption
- The correct approach is to get the raw bytes directly

## Fix Applied

Changed the decryption logic to:
```javascript
const base64Str = bytes.toString(CryptoJS.enc.Base64);
```

This ensures that:
- Binary data is preserved correctly
- No UTF-8 conversion is attempted on binary data
- Files can be decrypted without corruption

## Environment Variables

Also fixed environment variable naming inconsistency:

- **Backend**: Uses `ENCRYPTION_KEY`
- **Frontend**: Now uses `VITE_ENCRYPTION_KEY` (was incorrectly using `VITE_REACT_APP_ENCRYPTION_KEY`)

## Setup Instructions

### Local Development

1. Run the setup script:
   ```bash
   ./setup-env.sh
   ```

2. Update the `.env` file with your actual values:
   ```env
   DATABASE_URL=your-actual-database-url
   ENCRYPTION_KEY=your-32-character-encryption-key
   VITE_ENCRYPTION_KEY=your-32-character-encryption-key
   ```

### Production (Netlify)

Set these environment variables in your Netlify dashboard:
- `ENCRYPTION_KEY`
- `VITE_ENCRYPTION_KEY`

## Testing the Fix

1. Start the development server
2. Try uploading a PDF or image file
3. The file should now upload and decrypt successfully
4. Check the browser console for any remaining errors

## Files Modified

- `netlify/functions/api.js` - Fixed decryption logic
- `server/routes.ts` - Fixed decryption logic  
- `client/src/lib/file-encryption.ts` - Fixed decryption logic and environment variable
- `env.example` - Updated environment variable names
- `ENCRYPTION_SETUP.md` - Updated documentation
- `SETUP.md` - Updated documentation
- `setup-env.sh` - Created setup script

## Security Notes

- Always use strong, randomly generated encryption keys in production
- Never commit `.env` files to version control
- Use different encryption keys for different environments
- Regularly rotate encryption keys in production 
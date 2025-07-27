# Vercel Serverless Function for Hookinator

This directory contains the Vercel Serverless Function that handles webhook requests for the Hookinator project.

## File Structure

```
api/webhook/
├── [id].go          # Main serverless function handler
├── go.mod           # Go module dependencies
└── README.md        # This file
```

## Function Overview

The `[id].go` file contains a Vercel Serverless Function that:

1. **Handles webhook requests** at `/api/webhook/{id}`
2. **Saves incoming requests** to PostgreSQL database
3. **Forwards requests** to configured URLs (if any)
4. **Returns JSON responses** with appropriate status codes

## Key Features

### ✅ **Request Processing**

- Captures HTTP method, headers, body, and timestamp
- Stores data in PostgreSQL with proper JSON serialization
- Handles large request bodies efficiently

### ✅ **Webhook Forwarding**

- Checks for configured forward URLs in database
- Forwards requests asynchronously to prevent blocking
- Maintains original headers and request method
- Logs forwarding results for debugging

### ✅ **Database Integration**

- Connects to PostgreSQL using connection pooling
- Optimized for serverless environment (single connection)
- Proper error handling and connection cleanup

### ✅ **CORS Support**

- Handles preflight OPTIONS requests
- Sets appropriate CORS headers for cross-origin requests
- Supports all common HTTP methods

## Environment Variables

Set these environment variables in your Vercel project:

```bash
# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name

# Optional: JWT Secret (if you add authentication later)
JWT_SECRET=your_jwt_secret
```

## Database Schema Requirements

Ensure your PostgreSQL database has these tables:

```sql
-- Webhooks table
CREATE TABLE webhooks (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    forward_url TEXT,
    name VARCHAR(255),
    source_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Requests table
CREATE TABLE requests (
    request_id SERIAL PRIMARY KEY,
    webhook_id VARCHAR(255) REFERENCES webhooks(id) ON DELETE CASCADE,
    method VARCHAR(10),
    headers JSONB,
    body TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment Steps

### 1. **Install Vercel CLI**

```bash
npm install -g vercel
```

### 2. **Login to Vercel**

```bash
vercel login
```

### 3. **Deploy the Function**

```bash
# From the frontend directory
cd apps/frontend
vercel --prod
```

### 4. **Set Environment Variables**

```bash
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add DB_HOST
vercel env add DB_PORT
vercel env add DB_NAME
```

## API Endpoints

### POST `/api/webhook/{id}`

Receives webhook requests and processes them.

**Request:**

- Method: Any HTTP method
- Headers: Any headers
- Body: Any content

**Response:**

```json
{
  "status": "Webhook received"
}
```

**Error Response:**

```json
{
  "error": "Error message"
}
```

## Migration from Traditional Server

### ✅ **What's Migrated:**

- Core webhook handling logic
- Database operations (save, forward URL lookup)
- Request forwarding functionality
- Error handling and logging
- JSON response formatting

### ❌ **What's Removed:**

- `main()` function and `http.ListenAndServe`
- Chi router and middleware
- Authentication middleware (can be added later)
- File-based configuration loading
- Traditional server startup/shutdown

### 🔄 **What's Changed:**

- **Package name**: `handler` (required by Vercel)
- **Function signature**: `Handler(w http.ResponseWriter, r *http.Request)`
- **Database connection**: Per-request connection with serverless optimizations
- **URL parsing**: Manual path parsing instead of Chi router
- **CORS**: Built-in CORS handling for Vercel

## Performance Optimizations

### 🚀 **Serverless Optimizations:**

- **Connection pooling**: Single connection per function instance
- **Connection lifetime**: 30-second timeout
- **Async forwarding**: Non-blocking webhook forwarding
- **Memory efficient**: Minimal memory footprint

### 📊 **Monitoring:**

- Structured logging for request tracking
- Error logging for debugging
- Forwarding status logging

## Testing

### Local Testing

```bash
# Test with curl
curl -X POST https://your-vercel-app.vercel.app/api/webhook/test123 \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Production Testing

1. Create a webhook in your dashboard
2. Use the generated webhook URL
3. Send test requests to verify functionality

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check environment variables
   - Verify database is accessible from Vercel
   - Ensure SSL is enabled for production

2. **Function Timeout**
   - Check database query performance
   - Optimize connection settings
   - Monitor function execution time

3. **CORS Errors**
   - Verify CORS headers are set correctly
   - Check preflight request handling

## Next Steps

### 🔐 **Authentication**

Add JWT authentication middleware if needed:

```go
// Add to Handler function
if !isValidToken(r) {
    respondWithError(w, http.StatusUnauthorized, "Invalid token")
    return
}
```

### 📈 **Monitoring**

Integrate with Vercel Analytics and logging services for better monitoring.

### 🔄 **Additional Endpoints**

Add more serverless functions for other API endpoints (create, list, inspect webhooks).

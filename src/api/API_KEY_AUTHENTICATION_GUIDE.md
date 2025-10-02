# API Key Authentication Test Guide

## Overview

The API now has two authentication methods:

1. **JWT Bearer Token** - For dashboard/admin endpoints (Agents, Services GET, Caches)
2. **API Key Authentication** - For callback endpoints (Service Registration)

## Architecture

### Middleware Flow

```
Request → CORS → API Key Validation Middleware → JWT Authentication → Authorization → Controller
```

### API Key Validation Middleware

- **Path:** Only validates requests to `/api/callback/*`
- **Header Required:** `X-Api-Key`
- **Validation:** Queries Agent table for matching active API key
- **Response:** 401 Unauthorized if API key is invalid or missing

## Testing the API Key Authentication

### Step 1: Get an Agent API Key

First, you need to create an agent or use an existing one to get an API key.

#### Option A: Using Swagger (JWT Auth)

1. **Login to get JWT token:**

   ```http
   POST /api/auth/login
   {
     "email": "admin@volatix.com",
     "password": "admin123"
   }
   ```

   Response: `{ "token": "eyJ..." }`

2. **Authorize in Swagger:**

   - Click "Authorize" button
   - Enter: `Bearer {your-token}`
   - Click "Authorize" and "Close"

3. **Create an Agent:**

   ```http
   POST /api/agents
   {
     "name": "Test Agent",
     "url": "http://testagent.example.com"
   }
   ```

   Response:

   ```json
   {
     "id": "123...",
     "name": "Test Agent",
     "url": "http://testagent.example.com",
     "apiKey": "ak_1234567890abcdef",  ← COPY THIS
     "isApiKeyActive": true,
     "createdAt": "2025-10-02T10:00:00Z",
     "updatedAt": "2025-10-02T10:00:00Z"
   }
   ```

4. **Copy the API Key** from the response

### Step 2: Test Callback Endpoint with API Key

#### Using PowerShell:

```powershell
# Set your API key
$apiKey = "ak_1234567890abcdef"  # Replace with your actual API key

# Test health endpoint
$headers = @{
    "X-Api-Key" = $apiKey
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5046/api/callback/health" -Method Get -Headers $headers
```

**Expected Response:**

```json
{
  "status": "healthy",
  "message": "Callback controller is running"
}
```

#### Register a Service:

```powershell
$apiKey = "ak_1234567890abcdef"  # Your API key

$serviceData = @{
    name = "My Microservice"
    description = "A test microservice"
    port = 8080
    status = "Running"
} | ConvertTo-Json

$headers = @{
    "X-Api-Key" = $apiKey
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" -Method Post -Body $serviceData -Headers $headers
```

**Expected Response:**

```json
{
  "id": "456...",
  "name": "My Microservice",
  "description": "A test microservice",
  "port": 8080,
  "status": "Running",
  "createdAt": "2025-10-02T10:05:00Z",
  "updatedAt": "2025-10-02T10:05:00Z"
}
```

### Step 3: Test Invalid API Key

```powershell
# Test with invalid API key
$headers = @{
    "X-Api-Key" = "invalid_key_12345"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5046/api/callback/health" -Method Get -Headers $headers
```

**Expected Response:** `401 Unauthorized`

```json
{
  "message": "Invalid API Key"
}
```

### Step 4: Test Missing API Key

```powershell
# Test without API key header
Invoke-RestMethod -Uri "http://localhost:5046/api/callback/health" -Method Get
```

**Expected Response:** `401 Unauthorized`

```json
{
  "message": "API Key is missing"
}
```

## Using cURL (Linux/Mac/Git Bash)

### With Valid API Key:

```bash
# Health check
curl -X GET "http://localhost:5046/api/callback/health" \
  -H "X-Api-Key: ak_1234567890abcdef"

# Register service
curl -X POST "http://localhost:5046/api/callback/register-service" \
  -H "X-Api-Key: ak_1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Microservice",
    "description": "A test microservice",
    "port": 8080,
    "status": "Running"
  }'
```

### With Invalid API Key:

```bash
curl -X GET "http://localhost:5046/api/callback/health" \
  -H "X-Api-Key: invalid_key" \
  -v
```

## Using Postman

1. **Create a new request:**

   - Method: `POST`
   - URL: `http://localhost:5046/api/callback/register-service`

2. **Add Headers:**

   - Key: `X-Api-Key`
   - Value: `ak_1234567890abcdef` (your actual API key)
   - Key: `Content-Type`
   - Value: `application/json`

3. **Add Body (JSON):**

   ```json
   {
     "name": "My Microservice",
     "description": "A test microservice",
     "port": 8080,
     "status": "Running"
   }
   ```

4. **Send Request**

## API Endpoints Summary

### JWT Bearer Token Authentication

- `POST /api/auth/login` - Login
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `GET /api/services` - List services ✅ (Read-only)
- `GET /api/services/{id}` - Get service ✅ (Read-only)
- `GET /api/caches` - List caches
- (Other CRUD operations...)

### API Key Authentication

- `GET /api/callback/health` - Health check
- `POST /api/callback/register-service` - Register new service ✅ (Service creation via API key)

## Error Responses

### 401 - Missing API Key

```json
{
  "message": "API Key is missing"
}
```

### 401 - Invalid API Key

```json
{
  "message": "Invalid API Key"
}
```

### 400 - Bad Request (Invalid JSON)

```json
{
  "errors": {
    "Name": ["The Name field is required."]
  }
}
```

### 500 - Server Error

```json
{
  "message": "Error validating API Key: ..."
}
```

## Complete Test Script

```powershell
# Complete test script for API Key authentication

Write-Host "=== API Key Authentication Test ===" -ForegroundColor Cyan

# Step 1: Login and get JWT token
Write-Host "`n1. Getting JWT token..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token
Write-Host "✓ JWT Token received" -ForegroundColor Green

# Step 2: Create an agent and get API key
Write-Host "`n2. Creating agent..." -ForegroundColor Yellow
$agentResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/agents" `
    -Method Post `
    -Body '{"name":"Test Agent","url":"http://test.example.com"}' `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

$apiKey = $agentResponse.apiKey
Write-Host "✓ Agent created with API Key: $apiKey" -ForegroundColor Green

# Step 3: Test health endpoint with API key
Write-Host "`n3. Testing health endpoint..." -ForegroundColor Yellow
$healthResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/health" `
    -Method Get `
    -Headers @{"X-Api-Key" = $apiKey}

Write-Host "✓ Health check passed: $($healthResponse.message)" -ForegroundColor Green

# Step 4: Register a service using API key
Write-Host "`n4. Registering service..." -ForegroundColor Yellow
$serviceResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" `
    -Method Post `
    -Body '{"name":"Test Service","description":"Test","port":8080,"status":"Running"}' `
    -Headers @{
        "X-Api-Key" = $apiKey
        "Content-Type" = "application/json"
    }

Write-Host "✓ Service registered: $($serviceResponse.name) (ID: $($serviceResponse.id))" -ForegroundColor Green

# Step 5: Verify service was created (using JWT)
Write-Host "`n5. Verifying service creation..." -ForegroundColor Yellow
$services = Invoke-RestMethod -Uri "http://localhost:5046/api/services" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

$createdService = $services | Where-Object { $_.id -eq $serviceResponse.id }
if ($createdService) {
    Write-Host "✓ Service verified in database" -ForegroundColor Green
} else {
    Write-Host "✗ Service not found in database" -ForegroundColor Red
}

# Step 6: Test with invalid API key
Write-Host "`n6. Testing with invalid API key..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:5046/api/callback/health" `
        -Method Get `
        -Headers @{"X-Api-Key" = "invalid_key"}
    Write-Host "✗ Should have received 401 error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Correctly rejected invalid API key" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
```

## Security Notes

1. **API Keys are validated against the Agent table** - Only active agents can register services
2. **API Keys are checked on every request** to `/api/callback/*`
3. **The middleware runs before authentication** - API key validation happens first
4. **Services controller is read-only** - Only GET operations are allowed via JWT
5. **Service creation only via API key** - POST is only available through callback endpoint

## Troubleshooting

### Issue: "API Key is missing"

- **Solution:** Add the `X-Api-Key` header to your request

### Issue: "Invalid API Key"

- **Solution:** Verify the API key exists in the database and `isApiKeyActive` is true
- **Check:** Run `GET /api/agents` to see all agents and their API keys

### Issue: 500 Error

- **Solution:** Check the server logs for Cosmos DB connection issues
- **Verify:** Cosmos DB settings in `appsettings.json`

## Next Steps

1. Integrate with your microservices to auto-register on startup
2. Add logging to track which agents are registering services
3. Consider adding rate limiting to the callback endpoint
4. Implement service heartbeat/health monitoring

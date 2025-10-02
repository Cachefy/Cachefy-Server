# Quick API Reference

## Base URL

- **Development:** `https://localhost:7000/api`
- **Production:** `https://api.volatix.com/api`

## Authentication

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@volatix.com",
  "password": "admin123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "admin@volatix.com"
}
```

## Agents

All agent endpoints require authentication header:

```http
Authorization: Bearer <your-jwt-token>
```

### Get All Agents

```http
GET /agents
```

**Response:**

```json
[
  {
    "id": "agent-123",
    "name": "My Agent",
    "url": "https://example.com",
    "apiKey": "VkxUWC1BR05ULUFCQ0RFRkdI...",
    "apiKeyGenerated": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Create Agent

```http
POST /agents
Content-Type: application/json

{
  "name": "New Agent",
  "url": "https://newagent.com"
}
```

**Response:** Same as agent object above (includes auto-generated API key)

### Update Agent

```http
PUT /agents/{id}
Content-Type: application/json

{
  "name": "Updated Agent Name",
  "url": "https://updated-url.com"
}
```

**Response:** Updated agent object

### Delete Agent

```http
DELETE /agents/{id}
```

**Response:** `204 No Content`

### Regenerate API Key

```http
POST /agents/{id}/regenerate-api-key
```

**Response:**

```json
{
  "id": "agent-123",
  "name": "My Agent",
  "url": "https://example.com",
  "apiKey": "NEW-API-KEY-HERE",
  "apiKeyGenerated": "2024-01-15T14:20:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:20:00Z"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized

```json
{
  "message": "Invalid credentials"
}
```

### 404 Not Found

```json
{
  "message": "Agent not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "An error occurred"
}
```

## Testing with cURL

### Login

```bash
curl -X POST https://localhost:7000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@volatix.com\",\"password\":\"admin123\"}"
```

### Get Agents

```bash
curl -X GET https://localhost:7000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Agent

```bash
curl -X POST https://localhost:7000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Agent\",\"url\":\"https://test.com\"}"
```

### Update Agent

```bash
curl -X PUT https://localhost:7000/api/agents/agent-123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Updated Name\",\"url\":\"https://updated.com\"}"
```

### Delete Agent

```bash
curl -X DELETE https://localhost:7000/api/agents/agent-123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Regenerate API Key

```bash
curl -X POST https://localhost:7000/api/agents/agent-123/regenerate-api-key \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## PowerShell Examples

### Login

```powershell
$body = @{
    email = "admin@volatix.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://localhost:7000/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$token = $response.token
```

### Get Agents

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "https://localhost:7000/api/agents" `
    -Method Get `
    -Headers $headers
```

### Create Agent

```powershell
$body = @{
    name = "Test Agent"
    url = "https://test.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://localhost:7000/api/agents" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body
```

## Default Credentials

- **Email:** `admin@volatix.com`
- **Password:** `admin123`
- **Role:** Administrator

> ⚠️ **Important:** Change the default password in production!

## CORS Configuration

The API allows requests from:

- `http://localhost:4200`
- `http://localhost:4201`
- `http://localhost:4202`

If running Angular on a different port, update the CORS configuration in the .NET API's `Program.cs`.

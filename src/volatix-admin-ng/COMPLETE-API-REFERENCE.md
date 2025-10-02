# Complete API Reference

## Base URL

- **Development:** `http://localhost:5046/api`
- **Production:** `https://api.volatix.com/api`

## Authentication

All endpoints except `/auth/login` require JWT Bearer token authentication.

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

---

## Agents

### Get All Agents

```http
GET /agents
Authorization: Bearer <token>
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
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Agent",
  "url": "https://newagent.com"
}
```

### Update Agent

```http
PUT /agents/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Agent Name",
  "url": "https://updated-url.com"
}
```

### Delete Agent

```http
DELETE /agents/{id}
Authorization: Bearer <token>
```

### Regenerate API Key

```http
POST /agents/{id}/regenerate-api-key
Authorization: Bearer <token>
```

---

## Services

### Get All Services

```http
GET /services
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "service-123",
    "name": "My Service",
    "url": "https://service.example.com",
    "status": "Running",
    "uptime": "99.9%",
    "lastSeen": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "description": "Service description",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Create Service

```http
POST /services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Service",
  "url": "https://newservice.com",
  "status": "Running",
  "uptime": "100%",
  "version": "1.0.0",
  "description": "Service description"
}
```

### Update Service

```http
PUT /services/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Service Name",
  "url": "https://updated-url.com",
  "status": "Running",
  "uptime": "99.9%",
  "version": "1.1.0"
}
```

### Delete Service

```http
DELETE /services/{id}
Authorization: Bearer <token>
```

---

## Caches

### Get All Caches

```http
GET /caches
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "name": "user-cache",
    "serviceId": "service-123",
    "serviceName": "My Service",
    "type": "Redis",
    "size": "1.2 GB",
    "ttl": 3600,
    "hitRate": "95.5%",
    "entries": 10000,
    "status": "Active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Caches for Service

```http
GET /caches?serviceId={serviceId}
Authorization: Bearer <token>
```

### Create Cache

```http
POST /caches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "new-cache",
  "serviceId": "service-123",
  "serviceName": "My Service",
  "type": "Redis",
  "ttl": 3600,
  "size": "0 MB",
  "entries": 0,
  "hitRate": "0%",
  "status": "Active"
}
```

### Update Cache

```http
PUT /caches/{serviceId}/{name}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "user-cache",
  "serviceId": "service-123",
  "type": "Redis",
  "ttl": 7200,
  "size": "1.5 GB",
  "entries": 12000
}
```

### Delete Cache

```http
DELETE /caches/{serviceId}/{name}
Authorization: Bearer <token>
```

---

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
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "An error occurred"
}
```

---

## PowerShell Examples

### Login and Store Token

```powershell
$body = @{
    email = "admin@volatix.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$token = $response.token
$headers = @{
    Authorization = "Bearer $token"
}
```

### Get Agents

```powershell
Invoke-RestMethod -Uri "http://localhost:5046/api/agents" `
    -Method Get `
    -Headers $headers
```

### Create Agent

```powershell
$agentBody = @{
    name = "Test Agent"
    url = "https://test.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5046/api/agents" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $agentBody
```

### Get Services

```powershell
Invoke-RestMethod -Uri "http://localhost:5046/api/services" `
    -Method Get `
    -Headers $headers
```

### Create Service

```powershell
$serviceBody = @{
    name = "Test Service"
    url = "https://service.test.com"
    status = "Running"
    uptime = "100%"
    version = "1.0.0"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5046/api/services" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $serviceBody
```

### Get Caches

```powershell
Invoke-RestMethod -Uri "http://localhost:5046/api/caches" `
    -Method Get `
    -Headers $headers
```

### Create Cache

```powershell
$cacheBody = @{
    name = "test-cache"
    serviceId = "service-123"
    serviceName = "My Service"
    type = "Redis"
    ttl = 3600
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5046/api/caches" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $cacheBody
```

---

## Testing with cURL

### Login

```bash
curl -X POST http://localhost:5046/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@volatix.com\",\"password\":\"admin123\"}"
```

### Get Agents

```bash
curl -X GET http://localhost:5046/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Services

```bash
curl -X GET http://localhost:5046/api/services \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Caches

```bash
curl -X GET http://localhost:5046/api/caches \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Default Credentials

- **Email:** `admin@volatix.com`
- **Password:** `admin123`
- **Role:** Administrator

> ⚠️ **Important:** Change the default password in production!

---

## API Endpoints Summary

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ------------------------ |
| POST   | `/auth/login`                     | Authenticate user        |
| GET    | `/agents`                         | Get all agents           |
| POST   | `/agents`                         | Create agent             |
| PUT    | `/agents/{id}`                    | Update agent             |
| DELETE | `/agents/{id}`                    | Delete agent             |
| POST   | `/agents/{id}/regenerate-api-key` | Regenerate agent API key |
| GET    | `/services`                       | Get all services         |
| POST   | `/services`                       | Create service           |
| PUT    | `/services/{id}`                  | Update service           |
| DELETE | `/services/{id}`                  | Delete service           |
| GET    | `/caches`                         | Get all caches           |
| POST   | `/caches`                         | Create cache             |
| PUT    | `/caches/{serviceId}/{name}`      | Update cache             |
| DELETE | `/caches/{serviceId}/{name}`      | Delete cache             |

---

## Notes

- All authenticated endpoints require `Authorization: Bearer <token>` header
- Tokens expire after 24 hours (configurable in API)
- CORS is configured for `http://localhost:4200`, `4201`, `4202`
- API runs on HTTP for development (port 5046) to avoid certificate issues
- For production, use HTTPS with proper SSL certificates

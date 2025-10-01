# Volatix Server API Documentation

## Overview

The Volatix Server API is a .NET 8.0 Web API built with a clean architecture pattern, featuring JWT authentication, Cosmos DB integration, and comprehensive agent management capabilities. The API is designed to work seamlessly with the Angular admin interface.

## Architecture

### Solution Structure
```
VolatixServer.sln
 VolatixServer.Infrastructure    # Data access layer
 VolatixServer.Service          # Business logic layer  
 VolatixServer.Api             # Web API layer
```

### Technology Stack
- **.NET 8.0** - Web API Framework
- **Azure Cosmos DB** - NoSQL Database
- **JWT Bearer Authentication** - Security
- **BCrypt** - Password hashing
- **Swagger/OpenAPI** - API Documentation
- **Newtonsoft.Json** - JSON serialization

## Configuration

### appsettings.json
```json
{
  "CosmosDb": {
    "ConnectionString": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "DatabaseName": "VolatixDb",
    "ContainerName": "Items"
  },
  "Jwt": {
    "Key": "ThisIsASecretKeyForJWTTokenGenerationThatShouldBeAtLeast256BitsLong",
    "Issuer": "VolatixServer",
    "ExpireHours": "24"
  }
}
```

### CORS Configuration
The API is configured to allow requests from Angular development servers:
- `http://localhost:4200`
- `http://localhost:4201` 
- `http://localhost:4202`

## Authentication

### Default Credentials
- **Email**: `admin@volatix.com`
- **Password**: `admin123`

### JWT Token
All authenticated endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Base URL
- **Development**: `https://localhost:7XXX` (port varies)
- **Swagger UI**: `https://localhost:7XXX/swagger`

---

## Authentication Endpoints

### POST /api/auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "admin@volatix.com",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@volatix.com"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Invalid email or password"
}
```

---

## Agent Management Endpoints

All agent endpoints require JWT authentication.

### GET /api/agents
Retrieve all agents.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Agent Smith",
    "status": "Active",
    "apiKey": "dGVzdC1hcGkta2V5LWV4YW1wbGU",
    "isApiKeyActive": true,
    "createdAt": "2025-10-02T00:00:00Z",
    "updatedAt": "2025-10-02T00:00:00Z"
  }
]
```

### GET /api/agents/{id}
Retrieve a specific agent by ID.

**Parameters:**
- `id` (string, required) - Agent ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Agent Smith",
  "status": "Active", 
  "apiKey": "dGVzdC1hcGkta2V5LWV4YW1wbGU",
  "isApiKeyActive": true,
  "createdAt": "2025-10-02T00:00:00Z",
  "updatedAt": "2025-10-02T00:00:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "Agent with ID 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

### POST /api/agents
Create a new agent.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Agent",
  "status": "Active"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "New Agent",
  "status": "Active",
  "apiKey": "bmV3LWFnZW50LWFwaS1rZXk",
  "isApiKeyActive": true,
  "createdAt": "2025-10-02T00:00:00Z",
  "updatedAt": "2025-10-02T00:00:00Z"
}
```

### PUT /api/agents/{id}
Update an existing agent.

**Parameters:**
- `id` (string, required) - Agent ID

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Agent Name",
  "status": "Inactive"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Agent Name",
  "status": "Inactive",
  "apiKey": "dGVzdC1hcGkta2V5LWV4YW1wbGU",
  "isApiKeyActive": true,
  "createdAt": "2025-10-02T00:00:00Z",
  "updatedAt": "2025-10-02T00:05:00Z"
}
```

### DELETE /api/agents/{id}
Delete an agent.

**Parameters:**
- `id` (string, required) - Agent ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (204 No Content)**

**Error Response (404 Not Found):**
```json
{
  "message": "Agent with ID 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

### POST /api/agents/{id}/regenerate-api-key
Regenerate API key for an agent.

**Parameters:**
- `id` (string, required) - Agent ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "apiKey": "bmV3LXJlZ2VuZXJhdGVkLWtleQ"
}
```

---

## Data Models

### User Model
```json
{
  "id": "string",
  "email": "string", 
  "passwordHash": "string",
  "role": "string",
  "partitionKey": "users",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "version": "string"
}
```

### Agent Model
```json
{
  "id": "string",
  "name": "string",
  "status": "string",
  "apiKey": "string", 
  "isApiKeyActive": "boolean",
  "partitionKey": "agents",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "version": "string"
}
```

### Service Model
```json
{
  "id": "string",
  "name": "string",
  "status": "string",
  "port": "integer",
  "description": "string",
  "partitionKey": "services", 
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "version": "string"
}
```

### Cache Model
```json
{
  "id": "string",
  "name": "string",
  "type": "string",
  "size": "string",
  "status": "string",
  "partitionKey": "caches",
  "createdAt": "datetime", 
  "updatedAt": "datetime",
  "version": "string"
}
```

---

## API Key Generation

### Format
- **Algorithm**: Random 32-byte generation
- **Encoding**: Base64 with URL-safe characters
- **Transformations**: 
  - Replace `+` with `-`
  - Replace `/` with `_`
  - Remove trailing `=` padding

### Example Generation Process
```csharp
var randomBytes = new byte[32];
using (var rng = RandomNumberGenerator.Create())
{
    rng.GetBytes(randomBytes);
}

return Convert.ToBase64String(randomBytes)
    .Replace("+", "-")
    .Replace("/", "_")
    .TrimEnd('=');
```

---

## Error Handling

### Standard HTTP Status Codes
- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST requests  
- `204 No Content` - Successful DELETE requests
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format
```json
{
  "message": "Error description"
}
```

---

## Development Setup

### Prerequisites
- .NET 8.0 SDK
- Azure Cosmos DB Emulator or Azure Cosmos DB account
- Visual Studio 2022 or VS Code

### Running the API
1. **Clone the repository**
2. **Navigate to the src directory**
3. **Restore packages**: `dotnet restore VolatixServer.sln`
4. **Build the solution**: `dotnet build VolatixServer.sln`
5. **Run the API**: `dotnet run --project VolatixServer.Api`
6. **Access Swagger UI**: Navigate to `https://localhost:7XXX/swagger`

### Testing with cURL

**Login:**
```bash
curl -X POST "https://localhost:7XXX/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@volatix.com", 
    "password": "admin123"
  }'
```

**Get Agents (with token):**
```bash
curl -X GET "https://localhost:7XXX/api/agents" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Create Agent:**
```bash
curl -X POST "https://localhost:7XXX/api/agents" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "status": "Active"
  }'
```

---

## Security Features

### JWT Authentication
- **Algorithm**: HMAC SHA-256
- **Expiration**: 24 hours (configurable)
- **Claims**: Email, Role, UserID

### Password Security
- **Hashing**: BCrypt with salt
- **Rounds**: Default BCrypt work factor

### API Key Security
- **Generation**: Cryptographically secure random bytes
- **Storage**: Base64-encoded in database
- **Validation**: Server-side verification required

---

## Database Schema

### Cosmos DB Container Structure
- **Database Name**: `VolatixDb`
- **Container Name**: `Items`
- **Partition Key**: `/partitionKey`

### Partition Strategy
- **Users**: `partitionKey = "users"`
- **Agents**: `partitionKey = "agents"` 
- **Services**: `partitionKey = "services"`
- **Caches**: `partitionKey = "caches"`

---

## Integration with Angular Frontend

### CORS Configuration
The API is configured to accept requests from Angular development servers on ports 4200-4202.

### Matching Endpoints
The API endpoints are designed to match the existing Angular service interfaces:
- Agent CRUD operations
- API key generation/regeneration
- Authentication flow

### Data Compatibility
All response models match the TypeScript interfaces used in the Angular application.

---

## Production Considerations

### Environment Variables
For production deployment, override these settings via environment variables:
- `CosmosDb__ConnectionString`
- `Jwt__Key` 
- `Jwt__Issuer`

### Security Hardening
- Use Azure Key Vault for secrets
- Enable HTTPS only
- Configure proper CORS origins
- Implement rate limiting
- Add logging and monitoring

### Scaling
- Cosmos DB auto-scales based on RU consumption
- API can be deployed to Azure App Service with auto-scaling
- Consider Azure Functions for serverless scenarios

---

*Generated on October 2, 2025 - Volatix Labs*

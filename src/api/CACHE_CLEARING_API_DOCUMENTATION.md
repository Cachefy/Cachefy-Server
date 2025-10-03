# Cache Clearing API Documentation

## Overview

The Volatix Server API now supports cache clearing operations for services. These operations make external HTTP requests to the service's agent API to clear caches.

## Architecture

### Flow Diagram

```
CachesController
    ↓
CacheService
    ↓
Query Service by ID → Get Service Name & AgentId
    ↓
Query Agent by ID → Get Agent URL & API Key
    ↓
HTTP Request to External Agent API with API Key
    ↓
External Service Cache Endpoint
```

## Data Model Changes

### Service Model

Added `agentId` property to associate services with agents:

```csharp
public class Service : BaseEntity
{
    public string Name { get; set; }
    public string Status { get; set; } = "Running";
    public int Port { get; set; }
    public string Description { get; set; }
    public string? AgentId { get; set; }  // ← NEW
}
```

### Service DTOs

Updated to include `agentId`:

```csharp
public class CreateServiceDto
{
    public string Name { get; set; }
    public string Description { get; set; }
    public int Port { get; set; }
    public string Status { get; set; } = "Running";
    public string? AgentId { get; set; }  // ← NEW
}

public class ServiceResponseDto
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public int Port { get; set; }
    public string Status { get; set; }
    public string? AgentId { get; set; }  // ← NEW
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

## API Endpoints

### 1. Flush All Cache for Service

**Endpoint:** `POST /api/caches/flushall/{serviceId}`

**Authentication:** JWT Bearer Token

**Parameters:**

- `serviceId` (string, GUID) - The ID of the service

**Description:** Clears all cache entries for the specified service by calling the external agent API.

**Request Example:**

```http
POST /api/caches/flushall/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGc...
```

**Success Response (200 OK):**

```json
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "Cache flushed successfully",
  "parameters": {
    "key1": "value1",
    "key2": "value2"
  },
  "cacheKeys": ["key1", "key2", "key3"],
  "cacheResult": null
}
```

**Error Responses:**

**404 Not Found** - Service not found:

```json
{
  "message": "Service with ID {serviceId} not found"
}
```

**404 Not Found** - Agent not found:

```json
{
  "message": "Agent with ID {agentId} not found"
}
```

**400 Bad Request** - Service has no agent:

```json
{
  "message": "Service {serviceName} does not have an associated agent"
}
```

**400 Bad Request** - Agent API key inactive:

```json
{
  "message": "Agent {agentName} API key is not active"
}
```

**400 Bad Request** - External API call failed:

```json
{
  "message": "Cache flushed successfully"
}
```

**500 Internal Server Error** - External API request failed:

```json
{
  "message": "Failed to flush cache for service {serviceName}: {errorMessage}"
}
```

---

### 2. Clear Cache by Key for Service

**Endpoint:** `DELETE /api/caches/clear/{serviceId}/{cacheKey}`

**Authentication:** JWT Bearer Token

**Parameters:**

- `serviceId` (string, GUID) - The ID of the service
- `cacheKey` (string) - The cache key to clear

**Description:** Clears a specific cache key for the specified service by calling the external agent API.

**Request Example:**

```http
DELETE /api/caches/clear/123e4567-e89b-12d3-a456-426614174000/user:12345
Authorization: Bearer eyJhbGc...
```

**Success Response (200 OK):**

```json
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "Cache key 'user:12345' cleared successfully",
  "parameters": {
    "cacheKey": "user:12345"
  },
  "cacheKeys": [],
  "cacheResult": {
    "deleted": true,
    "key": "user:12345"
  }
}
```

**Error Responses:**

Same error responses as Flush All Cache endpoint.

---

## External API Calls

### Flush All Cache Request

**URL Pattern:** `{agentUrl}/api/cache/{serviceName}/flushall`

**Method:** POST

**Headers:**

```http
X-Api-Key: {agentApiKey}
```

**Expected Response:**

```json
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "Cache flushed successfully",
  "parameters": {},
  "cacheKeys": [],
  "cacheResult": null
}
```

**Example:**

```http
POST http://agent1.example.com/api/cache/MyService/flushall
X-Api-Key: ak_1234567890abcdef

Response:
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "All cache entries flushed",
  "parameters": {},
  "cacheKeys": [],
  "cacheResult": null
}
```

---

### Clear Cache by Key Request

**URL Pattern:** `{agentUrl}/api/cache/{serviceName}/clear/{cacheKey}`

**Method:** DELETE

**Headers:**

```http
X-Api-Key: {agentApiKey}
```

**Expected Response:**

```json
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "Cache key cleared successfully",
  "parameters": {
    "cacheKey": "user:12345"
  },
  "cacheKeys": [],
  "cacheResult": {
    "deleted": true
  }
}
```

**Example:**

```http
DELETE http://agent1.example.com/api/cache/MyService/clear/user:12345
X-Api-Key: ak_1234567890abcdef

Response:
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "Cache key 'user:12345' cleared",
  "parameters": {
    "cacheKey": "user:12345"
  },
  "cacheKeys": [],
  "cacheResult": {
    "deleted": true,
    "key": "user:12345"
  }
}
```

---

## Implementation Details

### ServiceFabricAgentResponse Model

```csharp
public class ServiceFabricAgentResponse
{
    public string ServiceName { get; set; }

    public int StatusCode { get; set; }

    public string Message { get; set; }

    public Dictionary<string, string> Parameters { get; set; }

    public List<string> CacheKeys { get; set; }

    public object CacheResult { get; set; }
}
```

This model represents the response from external Service Fabric agent APIs.

### CacheService Methods

#### FlushAllCacheAsync

```csharp
public async Task<ServiceFabricAgentResponse> FlushAllCacheAsync(string serviceId)
{
    // 1. Get service by ID
    var service = await _serviceRepository.GetByIdAsync(serviceId);

    // 2. Validate service has an agent
    if (string.IsNullOrEmpty(service.AgentId))
        throw new InvalidOperationException(...);

    // 3. Get agent by ID
    var agent = await _agentRepository.GetByIdAsync(service.AgentId);

    // 4. Validate agent API key is active
    if (!agent.IsApiKeyActive)
        throw new InvalidOperationException(...);

    // 5. Make HTTP POST request to external API
    var client = _httpClientFactory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Api-Key", agent.ApiKey);

    var url = $"{agent.Url}/api/cache/{service.Name}/flushall";
    var response = await client.PostAsync(url, null);

    // 6. Deserialize and return the ServiceFabricAgentResponse
    var responseContent = await response.Content.ReadAsStringAsync();
    var agentResponse = JsonSerializer.Deserialize<ServiceFabricAgentResponse>(
        responseContent,
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
    );

    return agentResponse;
}
```

#### ClearCacheByKeyAsync

```csharp
public async Task<ServiceFabricAgentResponse> ClearCacheByKeyAsync(string serviceId, string cacheKey)
{
    // 1. Get service by ID
    var service = await _serviceRepository.GetByIdAsync(serviceId);

    // 2. Validate service has an agent
    if (string.IsNullOrEmpty(service.AgentId))
        throw new InvalidOperationException(...);

    // 3. Get agent by ID
    var agent = await _agentRepository.GetByIdAsync(service.AgentId);

    // 4. Validate agent API key is active
    if (!agent.IsApiKeyActive)
        throw new InvalidOperationException(...);

    // 5. Make HTTP DELETE request to external API
    var client = _httpClientFactory.CreateClient();
    client.DefaultRequestHeaders.Add("X-Api-Key", agent.ApiKey);

    var url = $"{agent.Url}/api/cache/{service.Name}/clear/{cacheKey}";
    var response = await client.DeleteAsync(url);

    // 6. Deserialize and return the ServiceFabricAgentResponse
    var responseContent = await response.Content.ReadAsStringAsync();
    var agentResponse = JsonSerializer.Deserialize<ServiceFabricAgentResponse>(
        responseContent,
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
    );

    return agentResponse;
}
```

---

## Testing

### Prerequisites

1. Create an agent and get its API key
2. Create a service and associate it with the agent
3. Ensure the external agent API is running and accessible

### Test Flush All Cache

```powershell
# 1. Login and get JWT token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token

# 2. Create an agent
$agentResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/agents" `
    -Method Post `
    -Body '{"name":"Test Agent","url":"http://testagent.example.com"}' `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

$agentId = $agentResponse.id

# 3. Create a service with agent association
$serviceResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" `
    -Method Post `
    -Body "{`"name`":`"TestService`",`"description`":`"Test`",`"port`":8080,`"status`":`"Running`",`"agentId`":`"$agentId`"}" `
    -Headers @{
        "X-Api-Key" = $agentResponse.apiKey
        "Content-Type" = "application/json"
    }

$serviceId = $serviceResponse.id

# 4. Flush all cache for the service
$flushResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/flushall/$serviceId" `
    -Method Post `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "Flush Result:"
$flushResponse | ConvertTo-Json -Depth 10
```

### Test Clear Cache by Key

```powershell
# Clear specific cache key
$clearResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/clear/$serviceId/user:12345" `
    -Method Delete `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "Clear Result:"
$clearResponse | ConvertTo-Json -Depth 10
```

---

## Error Handling

### Service Not Found

```csharp
throw new KeyNotFoundException($"Service with ID {serviceId} not found");
```

### Agent Not Found

```csharp
throw new KeyNotFoundException($"Agent with ID {service.AgentId} not found");
```

### Service Has No Agent

```csharp
throw new InvalidOperationException($"Service {service.Name} does not have an associated agent");
```

### Agent API Key Inactive

```csharp
throw new InvalidOperationException($"Agent {agent.Name} API key is not active");
```

### External API Request Failed

```csharp
throw new InvalidOperationException($"Failed to flush cache for service {service.Name}: {ex.Message}", ex);
```

---

## Configuration

### HttpClientFactory Registration

Added in `Program.cs`:

```csharp
builder.Services.AddHttpClient();
```

### CacheService Dependency Injection

Updated constructor to include required dependencies:

```csharp
public CacheService(
    IRepository<Cache> cacheRepository,
    IRepository<Infrastructure.Models.Service> serviceRepository,
    IRepository<Agent> agentRepository,
    IHttpClientFactory httpClientFactory)
```

---

## Security Considerations

1. **JWT Authentication Required:** Both endpoints require valid JWT token
2. **API Key Validation:** External requests use agent's API key for authentication
3. **Agent Status Check:** Only active agents (IsApiKeyActive = true) can be used
4. **Service-Agent Association:** Services must be explicitly associated with agents
5. **URL Validation:** Agent URLs should be validated and properly formatted

---

## External API Requirements

Your external service agent API must implement these endpoints and return responses matching the `ServiceFabricAgentResponse` model:

### 1. Flush All Cache

```http
POST /api/cache/{serviceName}/flushall
X-Api-Key: {apiKey}

Response (200 OK):
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "string",
  "parameters": {},
  "cacheKeys": [],
  "cacheResult": null
}
```

### 2. Clear Cache by Key

```http
DELETE /api/cache/{serviceName}/clear/{cacheKey}
X-Api-Key: {apiKey}

Response (200 OK):
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "string",
  "parameters": {
    "cacheKey": "string"
  },
  "cacheKeys": [],
  "cacheResult": {}
}
```

---

## Troubleshooting

### Error: "Service does not have an associated agent"

**Solution:** When creating/registering a service, include the `agentId` in the request body.

### Error: "Agent API key is not active"

**Solution:** Check the agent's `isApiKeyActive` status. Regenerate the API key if needed.

### Error: "Failed to flush cache"

**Possible Causes:**

- Agent URL is incorrect or not reachable
- External API endpoint doesn't exist
- External API authentication failed
- Network connectivity issues

**Solution:** Verify agent URL, check external API logs, test API key manually.

---

## Summary

✅ Added `agentId` to Service model
✅ Updated Service DTOs with `agentId`
✅ Created `ServiceFabricAgentResponse` model for external API responses
✅ Implemented `FlushAllCacheAsync` in CacheService with response deserialization
✅ Implemented `ClearCacheByKeyAsync` in CacheService with response deserialization
✅ Added `/api/caches/flushall/{serviceId}` endpoint returning `ServiceFabricAgentResponse`
✅ Added `/api/caches/clear/{serviceId}/{cacheKey}` endpoint returning `ServiceFabricAgentResponse`
✅ Registered HttpClientFactory for external HTTP requests
✅ All logic moved to Service layer (CacheService)
✅ Proper error handling and validation
✅ Uses agent's URL and API key for external requests
✅ Deserializes external API responses to strongly-typed model

The cache clearing functionality is now complete with proper response handling!

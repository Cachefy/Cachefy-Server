# Cache API - Proxy to External Service

## Date

October 3, 2025

## Overview

Refactored the Cache API to act as a proxy to external Service Fabric agent APIs instead of managing cache data in Cosmos DB. All cache operations now query the external APIs directly using the service's associated agent.

---

## Changes Made

### 1. Removed Cache CRUD Operations

**Removed Methods:**

- ❌ `CreateCacheAsync` - No longer creating caches in Cosmos DB
- ❌ `UpdateCacheAsync` - No longer updating caches in Cosmos DB
- ❌ `DeleteCacheAsync` - No longer deleting caches from Cosmos DB

**Reason:** Cache data is managed by the external service agents, not by the Volatix Server.

---

### 2. Updated Get Methods to Query External API

#### GetAllCachesAsync

**Old Behavior:**

- Queried Cosmos DB `Caches` container
- Returned list of `CacheResponseDto`

**New Behavior:**

- Requires `serviceId` parameter
- Queries service → agent → external API
- Makes HTTP GET request to `{agentUrl}/api/cache/{serviceName}`
- Returns `ServiceFabricAgentResponse`

#### GetCacheByKeyAsync (formerly GetCacheByIdAsync)

**Old Behavior:**

- Queried Cosmos DB `Caches` container by ID
- Returned single `CacheResponseDto`

**New Behavior:**

- Requires `serviceId` and `cacheKey` parameters
- Queries service → agent → external API
- Makes HTTP GET request to `{agentUrl}/api/cache/{serviceName}/{cacheKey}`
- Returns `ServiceFabricAgentResponse`

---

### 3. Updated Service Interface

**File:** `VolatixServer.Service/Services/CacheService.cs`

**Before:**

```csharp
public interface ICacheService
{
    Task<IEnumerable<CacheResponseDto>> GetAllCachesAsync();
    Task<CacheResponseDto> GetCacheByIdAsync(string id);
    Task<CacheResponseDto> CreateCacheAsync(CreateCacheDto createCacheDto);
    Task<CacheResponseDto> UpdateCacheAsync(string id, UpdateCacheDto updateCacheDto);
    Task DeleteCacheAsync(string id);
    Task<ServiceFabricAgentResponse> FlushAllCacheAsync(string serviceId);
    Task<ServiceFabricAgentResponse> ClearCacheByKeyAsync(string serviceId, string cacheKey);
}
```

**After:**

```csharp
public interface ICacheService
{
    Task<ServiceFabricAgentResponse> GetAllCachesAsync(string serviceId);
    Task<ServiceFabricAgentResponse> GetCacheByKeyAsync(string serviceId, string cacheKey);
    Task<ServiceFabricAgentResponse> FlushAllCacheAsync(string serviceId);
    Task<ServiceFabricAgentResponse> ClearCacheByKeyAsync(string serviceId, string cacheKey);
}
```

**Key Changes:**

- All methods now return `ServiceFabricAgentResponse`
- All methods require `serviceId` parameter
- Removed create, update, and delete methods
- Renamed `GetCacheByIdAsync` to `GetCacheByKeyAsync`

---

### 4. Removed Cache Repository Dependency

**File:** `VolatixServer.Service/Services/CacheService.cs`

**Before:**

```csharp
public CacheService(
    IRepository<Cache> cacheRepository,
    IRepository<Infrastructure.Models.Service> serviceRepository,
    IRepository<Agent> agentRepository,
    IHttpClientFactory httpClientFactory)
```

**After:**

```csharp
public CacheService(
    IRepository<Infrastructure.Models.Service> serviceRepository,
    IRepository<Agent> agentRepository,
    IHttpClientFactory httpClientFactory)
```

**Reason:** No longer querying Cosmos DB for cache data.

---

### 5. Removed Cache Repository Registration

**File:** `VolatixServer.Api/Program.cs`

**Removed:**

```csharp
using CacheModel = VolatixServer.Infrastructure.Models.Cache;

// ... later in the file ...

builder.Services.AddScoped<IRepository<CacheModel>>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    var containerMappingService = sp.GetRequiredService<IContainerMappingService>();
    return new CosmosRepository<CacheModel>(cosmosClient, cosmosSettings.DatabaseName, containerMappingService);
});
```

---

### 6. Updated Controller Endpoints

**File:** `VolatixServer.Api/Controllers/CachesController.cs`

#### Removed Endpoints

- ❌ `GET /api/caches` - Get all caches from Cosmos DB
- ❌ `GET /api/caches/{id}` - Get cache by ID from Cosmos DB
- ❌ `POST /api/caches` - Create cache in Cosmos DB
- ❌ `PUT /api/caches/{id}` - Update cache in Cosmos DB
- ❌ `DELETE /api/caches/{id}` - Delete cache from Cosmos DB

#### New/Updated Endpoints

**1. Get All Caches for Service**

```
GET /api/caches/{serviceId}
Authorization: Bearer {jwt_token}
```

**Response:** `ServiceFabricAgentResponse` with cache list

**2. Get Cache by Key for Service**

```
GET /api/caches/{serviceId}/{cacheKey}
Authorization: Bearer {jwt_token}
```

**Response:** `ServiceFabricAgentResponse` with cache details

**3. Flush All Cache (unchanged)**

```
POST /api/caches/flushall/{serviceId}
Authorization: Bearer {jwt_token}
```

**4. Clear Cache by Key (unchanged)**

```
DELETE /api/caches/clear/{serviceId}/{cacheKey}
Authorization: Bearer {jwt_token}
```

---

## External API Contract

Your external Service Fabric agent APIs must implement these endpoints:

### 1. Get All Caches

```http
GET /api/cache/{serviceName}
X-Api-Key: {agentApiKey}

Response (200 OK):
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "string",
  "parameters": {},
  "cacheKeys": ["key1", "key2", "key3"],
  "cacheResult": {
    // Array or object with cache data
  }
}
```

### 2. Get Cache by Key

```http
GET /api/cache/{serviceName}/{cacheKey}
X-Api-Key: {agentApiKey}

Response (200 OK):
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "string",
  "parameters": {
    "cacheKey": "user:123"
  },
  "cacheKeys": [],
  "cacheResult": {
    // Cache value/data
  }
}
```

### 3. Flush All Cache

```http
POST /api/cache/{serviceName}/flushall
X-Api-Key: {agentApiKey}

Response (200 OK):
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "All caches flushed",
  "parameters": {},
  "cacheKeys": [],
  "cacheResult": null
}
```

### 4. Clear Cache by Key

```http
DELETE /api/cache/{serviceName}/clear/{cacheKey}
X-Api-Key: {agentApiKey}

Response (200 OK):
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "Cache key cleared",
  "parameters": {
    "cacheKey": "user:123"
  },
  "cacheKeys": [],
  "cacheResult": {
    "deleted": true
  }
}
```

---

## API Usage Examples

### PowerShell Examples

```powershell
# Login to get JWT token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token

# Assume you have a serviceId
$serviceId = "your-service-id-here"

# 1. Get all caches for a service
$allCaches = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/$serviceId" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "All Caches:"
$allCaches | ConvertTo-Json -Depth 10

# 2. Get specific cache by key
$cacheKey = "user:12345"
$cacheData = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/$serviceId/$cacheKey" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "Cache Data for key '$cacheKey':"
$cacheData | ConvertTo-Json -Depth 10

# 3. Flush all caches for the service
$flushResult = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/flushall/$serviceId" `
    -Method Post `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "Flush Result:"
$flushResult | ConvertTo-Json -Depth 10

# 4. Clear specific cache key
$clearResult = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/clear/$serviceId/$cacheKey" `
    -Method Delete `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "Clear Result:"
$clearResult | ConvertTo-Json -Depth 10
```

### cURL Examples

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:5046/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@volatix.com","password":"admin123"}' | jq -r '.token')

SERVICE_ID="your-service-id-here"

# 1. Get all caches for a service
curl -X GET "http://localhost:5046/api/caches/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 2. Get specific cache by key
curl -X GET "http://localhost:5046/api/caches/$SERVICE_ID/user:12345" \
  -H "Authorization: Bearer $TOKEN"

# 3. Flush all caches
curl -X POST "http://localhost:5046/api/caches/flushall/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 4. Clear specific cache key
curl -X DELETE "http://localhost:5046/api/caches/clear/$SERVICE_ID/user:12345" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Migration Guide

### For API Consumers

**Breaking Changes:**

1. **Endpoint URLs Changed:**

   - Old: `GET /api/caches` → New: `GET /api/caches/{serviceId}`
   - Old: `GET /api/caches/{id}` → New: `GET /api/caches/{serviceId}/{cacheKey}`

2. **Response Format Changed:**

   - Old: `CacheResponseDto` or `IEnumerable<CacheResponseDto>`
   - New: `ServiceFabricAgentResponse` (all endpoints)

3. **Removed Endpoints:**
   - `POST /api/caches` - No longer supported
   - `PUT /api/caches/{id}` - No longer supported
   - `DELETE /api/caches/{id}` - No longer supported (use `DELETE /api/caches/clear/{serviceId}/{cacheKey}` instead)

**Migration Steps:**

1. **Update Get All Caches:**

```typescript
// Before
const caches = await fetch("/api/caches", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// After
const serviceId = "your-service-id";
const response = await fetch(`/api/caches/${serviceId}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// Access cache data from response.cacheResult
const caches = response.cacheResult;
```

2. **Update Get Cache by ID:**

```typescript
// Before
const cache = await fetch(`/api/caches/${cacheId}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// After
const serviceId = "your-service-id";
const cacheKey = "user:123";
const response = await fetch(`/api/caches/${serviceId}/${cacheKey}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// Access cache data from response.cacheResult
const cache = response.cacheResult;
```

3. **Remove Create/Update Operations:**

```typescript
// These operations are no longer supported
// Caches must be managed by the external service agents
```

---

## Architecture Benefits

### Before (Cosmos DB Storage)

```
Client → Volatix API → Cosmos DB (Caches Container)
```

**Issues:**

- Duplicate data storage
- Data sync challenges between Cosmos and actual cache
- Performance overhead
- Complexity in maintaining cache state

### After (Proxy Pattern)

```
Client → Volatix API → Agent API → Service Cache
```

**Benefits:**

- ✅ Single source of truth (the actual service cache)
- ✅ Real-time data (no sync lag)
- ✅ Reduced storage costs (no duplicate data in Cosmos)
- ✅ Simplified architecture
- ✅ Direct cache operations

---

## Error Handling

All endpoints return consistent error responses:

### 404 Not Found - Service

```json
{
  "message": "Service with ID {serviceId} not found"
}
```

### 404 Not Found - Agent

```json
{
  "message": "Agent with ID {agentId} not found"
}
```

### 400 Bad Request - No Agent

```json
{
  "message": "Service {serviceName} does not have an associated agent"
}
```

### 400 Bad Request - Inactive API Key

```json
{
  "message": "Agent {agentName} API key is not active"
}
```

### 500 Internal Server Error

```json
{
  "message": "Failed to get caches for service {serviceName}: {error}"
}
```

---

## Testing

### Test Scenario 1: Get All Caches

```powershell
# Prerequisites: Service exists and has an associated active agent
$response = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/$serviceId" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

# Verify response structure
$response.serviceName | Should -Be "YourServiceName"
$response.statusCode | Should -Be 200
$response.cacheKeys | Should -Not -BeNullOrEmpty
```

### Test Scenario 2: Get Cache by Key

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/$serviceId/user:123" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

# Verify cache data returned
$response.cacheResult | Should -Not -BeNull
```

### Test Scenario 3: Service Without Agent

```powershell
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/$serviceWithoutAgent" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $token"}
} catch {
    $_.Exception.Response.StatusCode | Should -Be 400
}
```

---

## Summary

✅ **Removed:**

- Cache CRUD operations from Cosmos DB
- Cache repository dependency
- Cache repository registration
- Old cache endpoints

✅ **Updated:**

- GetAllCachesAsync now queries external API (requires serviceId)
- GetCacheByKeyAsync now queries external API (requires serviceId and cacheKey)
- Controller endpoints updated to match new signatures
- All cache operations now return `ServiceFabricAgentResponse`

✅ **Benefits:**

- Single source of truth for cache data
- Real-time cache queries
- Reduced storage costs
- Simplified architecture
- Better alignment with microservices patterns

✅ **Breaking Changes:**

- Endpoint URLs changed (now require serviceId)
- Response format changed to `ServiceFabricAgentResponse`
- Create/Update/Delete operations removed

The Cache API now acts as a pure proxy to the external service agents, providing real-time access to cache data without duplication!

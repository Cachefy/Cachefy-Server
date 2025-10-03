# Cache API Response Model Changes - Summary

## Date

October 3, 2025

## Overview

Updated the cache clearing API endpoints to return strongly-typed `ServiceFabricAgentResponse` objects instead of boolean values. This provides richer information from external agent APIs.

## Changes Made

### 1. New Model Created

**File:** `VolatixServer.Service/DTOs/ServiceFabricAgentResponse.cs`

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

**Purpose:** Represents the response structure from external Service Fabric agent cache APIs.

---

### 2. Interface Updated

**File:** `VolatixServer.Service/Services/CacheService.cs`

**Before:**

```csharp
Task<bool> FlushAllCacheAsync(string serviceId);
Task<bool> ClearCacheByKeyAsync(string serviceId, string cacheKey);
```

**After:**

```csharp
Task<ServiceFabricAgentResponse> FlushAllCacheAsync(string serviceId);
Task<ServiceFabricAgentResponse> ClearCacheByKeyAsync(string serviceId, string cacheKey);
```

---

### 3. CacheService Implementation Updated

**File:** `VolatixServer.Service/Services/CacheService.cs`

#### FlushAllCacheAsync Method

**Before:**

```csharp
var response = await client.PostAsync(url, null);
return response.IsSuccessStatusCode;
```

**After:**

```csharp
var response = await client.PostAsync(url, null);

if (!response.IsSuccessStatusCode)
{
    throw new InvalidOperationException(
        $"Failed to flush cache for service {service.Name}. Status: {response.StatusCode}"
    );
}

var responseContent = await response.Content.ReadAsStringAsync();
var agentResponse = JsonSerializer.Deserialize<ServiceFabricAgentResponse>(
    responseContent,
    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
);

return agentResponse ?? throw new InvalidOperationException(
    "Failed to deserialize agent response"
);
```

#### ClearCacheByKeyAsync Method

**Before:**

```csharp
var response = await client.DeleteAsync(url);
return response.IsSuccessStatusCode;
```

**After:**

```csharp
var response = await client.DeleteAsync(url);

if (!response.IsSuccessStatusCode)
{
    throw new InvalidOperationException(
        $"Failed to clear cache key '{cacheKey}' for service {service.Name}. Status: {response.StatusCode}"
    );
}

var responseContent = await response.Content.ReadAsStringAsync();
var agentResponse = JsonSerializer.Deserialize<ServiceFabricAgentResponse>(
    responseContent,
    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
);

return agentResponse ?? throw new InvalidOperationException(
    "Failed to deserialize agent response"
);
```

---

### 4. Controller Updated

**File:** `VolatixServer.Api/Controllers/CachesController.cs`

#### FlushAllCache Endpoint

**Before:**

```csharp
[HttpPost("flushall/{serviceId}")]
public async Task<ActionResult> FlushAllCache(string serviceId)
{
    var result = await _cacheService.FlushAllCacheAsync(serviceId);
    if (result)
    {
        return Ok(new { message = "Cache flushed successfully" });
    }
    return BadRequest(new { message = "Failed to flush cache" });
}
```

**After:**

```csharp
[HttpPost("flushall/{serviceId}")]
public async Task<ActionResult<ServiceFabricAgentResponse>> FlushAllCache(string serviceId)
{
    var result = await _cacheService.FlushAllCacheAsync(serviceId);
    return Ok(result);
}
```

#### ClearCacheByKey Endpoint

**Before:**

```csharp
[HttpDelete("clear/{serviceId}/{cacheKey}")]
public async Task<ActionResult> ClearCacheByKey(string serviceId, string cacheKey)
{
    var result = await _cacheService.ClearCacheByKeyAsync(serviceId, cacheKey);
    if (result)
    {
        return Ok(new { message = $"Cache key '{cacheKey}' cleared successfully" });
    }
    return BadRequest(new { message = "Failed to clear cache key" });
}
```

**After:**

```csharp
[HttpDelete("clear/{serviceId}/{cacheKey}")]
public async Task<ActionResult<ServiceFabricAgentResponse>> ClearCacheByKey(string serviceId, string cacheKey)
{
    var result = await _cacheService.ClearCacheByKeyAsync(serviceId, cacheKey);
    return Ok(result);
}
```

---

## API Response Changes

### Flush All Cache Endpoint

**Endpoint:** `POST /api/caches/flushall/{serviceId}`

**Old Response (200 OK):**

```json
{
  "message": "Cache flushed successfully"
}
```

**New Response (200 OK):**

```json
{
  "serviceName": "MyService",
  "statusCode": 200,
  "message": "Cache flushed successfully",
  "parameters": {},
  "cacheKeys": ["key1", "key2", "key3"],
  "cacheResult": null
}
```

---

### Clear Cache by Key Endpoint

**Endpoint:** `DELETE /api/caches/clear/{serviceId}/{cacheKey}`

**Old Response (200 OK):**

```json
{
  "message": "Cache key 'user:12345' cleared successfully"
}
```

**New Response (200 OK):**

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

---

## External API Contract

External Service Fabric agent APIs must return responses in the `ServiceFabricAgentResponse` format:

### Required Response Structure

```json
{
  "serviceName": "string",
  "statusCode": 200,
  "message": "string",
  "parameters": {},
  "cacheKeys": [],
  "cacheResult": null
}
```

### Response Fields

| Field         | Type                       | Required | Description                             |
| ------------- | -------------------------- | -------- | --------------------------------------- |
| `serviceName` | string                     | Yes      | Name of the service                     |
| `statusCode`  | int                        | Yes      | HTTP status code (typically 200)        |
| `message`     | string                     | Yes      | Human-readable message                  |
| `parameters`  | Dictionary<string, string> | Yes      | Key-value pairs with additional context |
| `cacheKeys`   | List<string>               | Yes      | List of cache keys affected             |
| `cacheResult` | object                     | Yes      | Additional result data (can be null)    |

---

## Benefits

1. **Richer Information:** Clients now receive detailed information from the external API
2. **Better Debugging:** The full response helps troubleshoot issues with external services
3. **Flexibility:** The `cacheResult` object field allows for varied response data
4. **Type Safety:** Strongly-typed response model reduces errors
5. **Consistency:** Both endpoints now return the same response structure

---

## Breaking Changes

⚠️ **This is a breaking change for API consumers**

Clients calling these endpoints must update their code to handle the new response structure:

**Before:**

```javascript
// Old client code
const response = await fetch("/api/caches/flushall/{serviceId}", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
const data = await response.json();
console.log(data.message); // "Cache flushed successfully"
```

**After:**

```javascript
// New client code
const response = await fetch("/api/caches/flushall/{serviceId}", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
const data = await response.json();
console.log(data.serviceName); // "MyService"
console.log(data.statusCode); // 200
console.log(data.message); // "Cache flushed successfully"
console.log(data.cacheKeys); // ["key1", "key2", "key3"]
```

---

## Migration Guide for Consumers

### Angular/TypeScript Example

1. **Create the response interface:**

```typescript
export interface ServiceFabricAgentResponse {
  serviceName: string;
  statusCode: number;
  message: string;
  parameters: { [key: string]: string };
  cacheKeys: string[];
  cacheResult: any;
}
```

2. **Update service calls:**

```typescript
// Before
flushCache(serviceId: string): Observable<{ message: string }> {
  return this.http.post<{ message: string }>(
    `/api/caches/flushall/${serviceId}`,
    null
  );
}

// After
flushCache(serviceId: string): Observable<ServiceFabricAgentResponse> {
  return this.http.post<ServiceFabricAgentResponse>(
    `/api/caches/flushall/${serviceId}`,
    null
  );
}
```

3. **Update component code:**

```typescript
// Before
this.cacheService.flushCache(serviceId).subscribe((response) => {
  console.log(response.message);
});

// After
this.cacheService.flushCache(serviceId).subscribe((response) => {
  console.log(response.message);
  console.log(`Status: ${response.statusCode}`);
  console.log(`Cache keys cleared: ${response.cacheKeys.length}`);
});
```

---

## Testing

### PowerShell Test Script

```powershell
# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token

# Test flush all cache
$serviceId = "your-service-id-here"
$flushResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/flushall/$serviceId" `
    -Method Post `
    -Headers @{"Authorization" = "Bearer $token"}

# Display full response
Write-Host "Flush Response:"
$flushResponse | ConvertTo-Json -Depth 10

# Test clear cache by key
$clearResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/caches/clear/$serviceId/user:12345" `
    -Method Delete `
    -Headers @{"Authorization" = "Bearer $token"}

# Display full response
Write-Host "Clear Response:"
$clearResponse | ConvertTo-Json -Depth 10
```

---

## Build Status

✅ **Build Successful**

- All 3 projects compiled successfully
- No compilation errors
- Only NuGet vulnerability warnings (related to external package source)

---

## Files Modified

1. ✅ `VolatixServer.Service/DTOs/ServiceFabricAgentResponse.cs` (NEW)
2. ✅ `VolatixServer.Service/Services/CacheService.cs` (MODIFIED)
3. ✅ `VolatixServer.Api/Controllers/CachesController.cs` (MODIFIED)
4. ✅ `CACHE_CLEARING_API_DOCUMENTATION.md` (UPDATED)

---

## Next Steps

1. **Update Client Applications:** Modify all clients consuming these endpoints
2. **Test External APIs:** Verify external agent APIs return the correct response format
3. **Update API Documentation:** Ensure Swagger/OpenAPI specs reflect the new response
4. **Communication:** Notify all API consumers about the breaking change

---

## Rollback Plan

If issues arise, revert commits in this order:

1. Revert controller changes (restore old response format)
2. Revert service implementation (restore boolean return types)
3. Revert interface changes
4. Delete ServiceFabricAgentResponse.cs

Alternatively, maintain API versioning (e.g., `/api/v1/caches` vs `/api/v2/caches`) to support both response formats.

---

## Summary

✅ Created `ServiceFabricAgentResponse` model
✅ Updated `ICacheService` interface
✅ Modified `FlushAllCacheAsync` implementation with deserialization
✅ Modified `ClearCacheByKeyAsync` implementation with deserialization
✅ Updated `CachesController` to return typed responses
✅ Enhanced error handling with HTTP status code checks
✅ Updated documentation with new response examples
✅ Build successful - no compilation errors

The cache clearing API now provides comprehensive response data from external Service Fabric agents!

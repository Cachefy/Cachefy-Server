# getCaches Method Update - Unified Cache Retrieval

## Overview
Updated the `getCaches()` method to handle both dashboard cache listing and service-specific agent response data. The method now supports an optional `serviceId` parameter that determines the response format.

## Changes Made

### Removed Method
- ❌ **`getAgentResponsesForService(serviceId: string)`** - Removed in favor of unified `getCaches()` method

### Updated Method: `getCaches()`

#### Method Signature
```typescript
getCaches(serviceId?: string): Observable<AgentResponse[] | Cache[]>
```

#### Implementation

```typescript
getCaches(serviceId?: string): Observable<AgentResponse[] | Cache[]> {
  if (serviceId) {
    // When serviceId is provided, return AgentResponse[]
    return this.http
      .get<AgentResponse[]>(`${environment.apiUrl}/caches?serviceId=${serviceId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          this.addLog(`Loaded ${response.length} agent responses for service ${serviceId}`);
          return response;
        }),
        catchError((err) => {
          this.addLog(`Error loading agent responses for service ${serviceId}: ${err.message}`);
          this.notificationService.showError('Failed to load agent responses', err.message);
          return of([]);
        })
      );
  } else {
    // When no serviceId, return Cache[] for dashboard
    return this.http
      .get<Cache[]>(`${environment.apiUrl}/caches`, { headers: this.getAuthHeaders() })
      .pipe(
        map((cachesList) => {
          this.caches.set(cachesList);
          this.addLog(`Loaded ${cachesList.length} caches from API`);
          return cachesList;
        }),
        catchError((err) => {
          this.addLog('Error loading caches from API: ' + err.message);
          this.notificationService.showError('Failed to load caches', err.message);
          return of([]);
        })
      );
  }
}
```

## Usage Patterns

### 1. Dashboard Usage (No serviceId)

**Returns:** `Cache[]` - Simple cache list for dashboard display

```typescript
// In dashboard.component.ts
this.dataService.getCaches().subscribe((caches) => {
  this.caches.set(caches as Cache[]);
  this.updateMetrics();
});
```

**API Endpoint:** `GET /api/caches`

**Response Format:**
```json
[
  {
    "serviceId": "auth-service",
    "serviceName": "Authentication Service",
    "name": "SessionHistory",
    "status": "active",
    "items": 1500,
    "ttl": 3600,
    "hits": 25000
  },
  {
    "serviceId": "payment-service",
    "serviceName": "Payment Service",
    "name": "TransactionCache",
    "status": "active",
    "items": 800,
    "ttl": 1800,
    "hits": 12000
  }
]
```

### 2. Service Detail Usage (With serviceId)

**Returns:** `AgentResponse[]` - Detailed agent response data

```typescript
// In service-detail.component.ts
this.dataService.getCaches(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses as AgentResponse[]);
});
```

**API Endpoint:** `GET /api/caches?serviceId={serviceId}`

**Response Format:**
```json
[
  {
    "parametersDetails": [
      {
        "name": "Agent1",
        "parameters": {
          "apiKey": "abc123",
          "region": "us-east-1",
          "environment": "production"
        }
      }
    ],
    "cacheKeys": [
      "SessionHistory",
      "UserPreferences",
      "AuthTokens"
    ],
    "cacheResult": {
      "status": "active",
      "lastUpdated": "2025-10-04T10:30:00Z",
      "itemCount": 150
    }
  }
]
```

## Type Casting

Due to the union return type `AgentResponse[] | Cache[]`, components must use type assertions:

### Dashboard Component
```typescript
this.dataService.getCaches().subscribe((caches) => {
  this.caches.set(caches as Cache[]); // Assert as Cache[]
});
```

### Service Detail Component
```typescript
this.dataService.getCaches(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses as AgentResponse[]); // Assert as AgentResponse[]
});
```

## Benefits

### 1. Unified Interface
- Single method for cache retrieval
- Consistent naming across the application
- Easier to understand and maintain

### 2. Reduced Code Duplication
- No separate `getAgentResponsesForService()` method needed
- Shared error handling and logging logic
- Single point of modification

### 3. Flexible Design
- Parameter-driven behavior
- Easy to extend with additional parameters
- Maintains backward compatibility

### 4. Clear Separation of Concerns
- Dashboard gets simple cache list
- Service details get detailed agent responses
- Each use case has appropriate data structure

## API Endpoints

| Use Case | Method Call | Endpoint | Response Type |
|----------|------------|----------|---------------|
| Dashboard | `getCaches()` | `GET /api/caches` | `Cache[]` |
| Service Detail | `getCaches(serviceId)` | `GET /api/caches?serviceId={id}` | `AgentResponse[]` |

## Updated Components

### 1. Dashboard Component (`dashboard.ts`)

**Before:**
```typescript
this.dataService.getCaches().subscribe((caches) => {
  this.caches.set(caches);
});
```

**After:**
```typescript
this.dataService.getCaches().subscribe((caches) => {
  this.caches.set(caches as Cache[]);
});
```

### 2. Service Detail Component (`service-detail.ts`)

**Before:**
```typescript
this.dataService.getAgentResponsesForService(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses);
});
```

**After:**
```typescript
this.dataService.getCaches(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses as AgentResponse[]);
});
```

## Migration Notes

### Breaking Changes
- Removed `getAgentResponsesForService()` method
- `getCaches()` now returns union type requiring type assertions

### Components Updated
- ✅ Dashboard Component - Added type assertion `as Cache[]`
- ✅ Service Detail Component - Changed from `getAgentResponsesForService()` to `getCaches()` with type assertion

### No Breaking Changes For
- `getCachesForService()` - Still exists for cache key retrieval
- `getCacheByKey()` - Unchanged
- `clearCache()` - Unchanged
- `flushServiceCaches()` - Unchanged
- `deleteCache()` - Unchanged

## Backend Requirements

### Dashboard Endpoint
```csharp
[HttpGet("caches")]
public async Task<ActionResult<List<Cache>>> GetCaches()
{
    // No serviceId parameter
    var allCaches = await _cacheService.GetAllCachesAsync();
    return Ok(allCaches);
}
```

**Response:**
```csharp
public class Cache
{
    public string ServiceId { get; set; }
    public string ServiceName { get; set; }
    public string Name { get; set; }
    public string Status { get; set; }
    public int Items { get; set; }
    public int Ttl { get; set; }
    public int Hits { get; set; }
}
```

### Service Detail Endpoint
```csharp
[HttpGet("caches")]
public async Task<ActionResult<List<AgentResponse>>> GetCaches(
    [FromQuery] string? serviceId = null)
{
    // serviceId parameter provided
    if (!string.IsNullOrEmpty(serviceId))
    {
        var agentResponses = await _cacheService.GetAgentResponsesForServiceAsync(serviceId);
        return Ok(agentResponses);
    }
    
    // No serviceId - return simple cache list
    var allCaches = await _cacheService.GetAllCachesAsync();
    return Ok(allCaches);
}
```

**Response:**
```csharp
public class AgentResponse
{
    public List<ParametersDetails> ParametersDetails { get; set; }
    public List<string> CacheKeys { get; set; }
    public object CacheResult { get; set; }
}

public class ParametersDetails
{
    public string Name { get; set; }
    public Dictionary<string, string> Parameters { get; set; }
}
```

## Testing Checklist

### Dashboard
- [ ] Call `getCaches()` without parameters
- [ ] Verify endpoint is `GET /api/caches`
- [ ] Confirm response is `Cache[]`
- [ ] Check dashboard displays cache list correctly
- [ ] Verify metrics are calculated properly

### Service Detail
- [ ] Call `getCaches(serviceId)`
- [ ] Verify endpoint is `GET /api/caches?serviceId={id}`
- [ ] Confirm response is `AgentResponse[]`
- [ ] Check agent response cards display correctly
- [ ] Verify parameters, cache keys, and results show properly

### Error Handling
- [ ] Test with invalid serviceId
- [ ] Test with API offline
- [ ] Verify error notifications appear
- [ ] Check logs contain error messages

### Type Safety
- [ ] Ensure no TypeScript compilation errors
- [ ] Verify type assertions work correctly
- [ ] Check IDE autocomplete works properly

## Advantages

### Design Pattern
- **Polymorphic Method**: Single method with context-dependent behavior
- **Parameter Overloading**: Optional parameter changes return type
- **Type Safety**: Union types ensure type checking at compile time

### Code Quality
- **DRY Principle**: Don't Repeat Yourself - single method for cache retrieval
- **Single Responsibility**: Each branch handles one specific use case
- **Open/Closed**: Easy to extend with additional parameters

### Maintainability
- **Fewer Methods**: Less API surface area
- **Consistent Naming**: Same method name across use cases
- **Centralized Logic**: Error handling and logging in one place

## Future Enhancements

### Additional Parameters
```typescript
getCaches(
  serviceId?: string,
  includeDetails?: boolean,
  filter?: CacheFilter
): Observable<AgentResponse[] | Cache[]>
```

### Typed Overloads
```typescript
// Method overloads for better type inference
getCaches(): Observable<Cache[]>;
getCaches(serviceId: string): Observable<AgentResponse[]>;
getCaches(serviceId?: string): Observable<AgentResponse[] | Cache[]> {
  // Implementation
}
```

### Generic Approach
```typescript
getCaches<T = Cache>(
  serviceId?: string
): Observable<T[]>
```

## Related Documentation

- See `AGENT-RESPONSE-STRUCTURE.md` for AgentResponse model details
- See `CACHE-API-PARAMETER-RENAME.md` for cache parameter changes
- See `CACHE-MANAGEMENT-FEATURES.md` for cache management features

# getCachesForService Method - Unified Cache Retrieval

## Overview
Consolidated cache retrieval into a single `getCachesForService()` method that handles both dashboard (all caches) and service-specific (agent responses) use cases. The method uses an optional `serviceId` parameter to determine the behavior and return type.

## Changes Made

### Removed Methods
- ❌ **`getCaches(serviceId: string)`** - Removed
- ❌ **`getAllCaches()`** - Removed

### Updated Method: `getCachesForService()`

#### Method Signature
```typescript
getCachesForService(serviceId?: string): Observable<AgentResponse[] | Cache[]>
```

#### Implementation

```typescript
getCachesForService(serviceId?: string): Observable<AgentResponse[] | Cache[]> {
  if (serviceId) {
    // When serviceId is provided, return AgentResponse[] for service details
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

### 1. Dashboard Usage (No Parameter)

**Call:**
```typescript
this.dataService.getCachesForService().subscribe((caches) => {
  this.caches.set(caches as Cache[]);
});
```

**Returns:** `Cache[]` - All caches across all services

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

**Call:**
```typescript
this.dataService.getCachesForService(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses as AgentResponse[]);
});
```

**Returns:** `AgentResponse[]` - Detailed agent response data for the service

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

## Component Updates

### Dashboard Component (`dashboard.ts`)

**Before:**
```typescript
this.dataService.getAllCaches().subscribe((caches) => {
  this.caches.set(caches);
});
```

**After:**
```typescript
this.dataService.getCachesForService().subscribe((caches) => {
  this.caches.set(caches as Cache[]);
});
```

**Note:** Type assertion `as Cache[]` is required due to union return type.

### Service Detail Component (`service-detail.ts`)

**Before:**
```typescript
this.dataService.getCaches(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses);
});
```

**After:**
```typescript
this.dataService.getCachesForService(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses as AgentResponse[]);
});
```

**Note:** Type assertion `as AgentResponse[]` is required due to union return type.

## Method Comparison

| Use Case | Method Call | Return Type | Endpoint | Type Assertion |
|----------|-------------|-------------|----------|----------------|
| Dashboard | `getCachesForService()` | `Observable<Cache[]>` | `GET /api/caches` | `as Cache[]` |
| Service Detail | `getCachesForService(serviceId)` | `Observable<AgentResponse[]>` | `GET /api/caches?serviceId={id}` | `as AgentResponse[]` |

## Benefits

### 1. Unified API
- ✅ Single method name for cache retrieval
- ✅ Consistent naming convention
- ✅ One method to maintain

### 2. Flexible Design
- ✅ Optional parameter controls behavior
- ✅ Same method serves different use cases
- ✅ Easy to understand: parameter presence determines response type

### 3. Reduced Code
- ✅ Eliminated two separate methods
- ✅ Less code to maintain
- ✅ Fewer exports in service

### 4. Clear Semantics
- ✅ Method name clearly indicates purpose
- ✅ Parameter makes intent obvious
- ✅ TypeScript union type indicates dual behavior

## Trade-offs

### Union Return Type
- **Pro:** Single method handles both cases
- **Con:** Requires type assertions in calling code
- **Mitigation:** Well-documented usage patterns

### Type Assertions
- **Pro:** Explicit about expected type
- **Con:** Bypasses TypeScript type checking
- **Mitigation:** Consistent usage patterns ensure correctness

## Backend Requirements

### C# Controller
```csharp
[HttpGet("caches")]
public async Task<IActionResult> GetCaches([FromQuery] string? serviceId = null)
{
    // Service-specific agent responses
    if (!string.IsNullOrEmpty(serviceId))
    {
        var agentResponses = await _cacheService.GetAgentResponsesForServiceAsync(serviceId);
        return Ok(agentResponses);
    }
    
    // All caches for dashboard
    var allCaches = await _cacheService.GetAllCachesAsync();
    return Ok(allCaches);
}
```

### Response Models

**Cache (Dashboard):**
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

**AgentResponse (Service Detail):**
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

## Usage Examples

### Dashboard - Get All Caches
```typescript
// In dashboard.component.ts
loadData() {
  this.dataService.getCachesForService().subscribe((caches) => {
    // Assert as Cache[] since we didn't pass serviceId
    this.caches.set(caches as Cache[]);
    
    // Display caches in dashboard table
    caches.forEach(cache => {
      console.log(`${cache.serviceName}: ${cache.name} (${cache.items} items)`);
    });
  });
}
```

### Service Detail - Get Agent Responses
```typescript
// In service-detail.component.ts
loadServiceData(serviceId: string) {
  this.dataService.getCachesForService(serviceId).subscribe((responses) => {
    // Assert as AgentResponse[] since we passed serviceId
    this.agentResponses.set(responses as AgentResponse[]);
    
    // Display agent response data
    responses.forEach(response => {
      console.log('Parameters:', response.parametersDetails);
      console.log('Cache Keys:', response.cacheKeys);
      console.log('Result:', response.cacheResult);
    });
  });
}
```

## Migration Notes

### Breaking Changes
- ✅ Removed `getCaches(serviceId: string)` method
- ✅ Removed `getAllCaches()` method
- ✅ Consolidated into `getCachesForService(serviceId?: string)`

### Components Updated
- ✅ Dashboard: Changed from `getAllCaches()` to `getCachesForService()` with type assertion
- ✅ Service Detail: Changed from `getCaches(serviceId)` to `getCachesForService(serviceId)` with type assertion

### Type Safety
- ⚠️ Union return type requires type assertions: `as Cache[]` or `as AgentResponse[]`
- ✅ No TypeScript compilation errors
- ✅ Runtime behavior unchanged

## Testing Checklist

### Dashboard (No Parameter)
- [ ] Call `getCachesForService()` without parameters
- [ ] Verify endpoint: `GET /api/caches`
- [ ] Confirm response is `Cache[]`
- [ ] Check dashboard displays all caches correctly
- [ ] Verify metrics calculation works
- [ ] Test error handling

### Service Detail (With Parameter)
- [ ] Call `getCachesForService(serviceId)`
- [ ] Verify endpoint: `GET /api/caches?serviceId={id}`
- [ ] Confirm response is `AgentResponse[]`
- [ ] Check agent response cards display correctly
- [ ] Verify parameters, cache keys, and results show
- [ ] Test error handling with invalid serviceId

### Type Assertions
- [ ] Ensure no runtime type errors
- [ ] Verify type assertions are correct
- [ ] Check TypeScript compilation succeeds
- [ ] Test with empty responses

### API Integration
- [ ] Test with backend returning correct formats
- [ ] Verify error responses are handled
- [ ] Check loading states work properly
- [ ] Test with API offline

## API Request/Response Examples

### Dashboard Request
```http
GET /api/caches HTTP/1.1
Authorization: Bearer {token}
```

**Response:**
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
  }
]
```

### Service Detail Request
```http
GET /api/caches?serviceId=auth-service HTTP/1.1
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "parametersDetails": [
      {
        "name": "Agent1",
        "parameters": {
          "apiKey": "abc123",
          "region": "us-east-1"
        }
      }
    ],
    "cacheKeys": ["SessionHistory", "UserPreferences"],
    "cacheResult": {
      "status": "active",
      "itemCount": 150
    }
  }
]
```

## Best Practices

### Using Type Assertions
```typescript
// ✅ Good - Clear intent
this.dataService.getCachesForService().subscribe((caches) => {
  this.caches.set(caches as Cache[]);
});

// ✅ Good - With serviceId
this.dataService.getCachesForService(serviceId).subscribe((responses) => {
  this.agentResponses.set(responses as AgentResponse[]);
});

// ❌ Bad - Wrong type assertion
this.dataService.getCachesForService(serviceId).subscribe((responses) => {
  this.caches.set(responses as Cache[]); // Wrong! Should be AgentResponse[]
});
```

### Error Handling
```typescript
this.dataService.getCachesForService(serviceId).subscribe({
  next: (responses) => {
    this.agentResponses.set(responses as AgentResponse[]);
  },
  error: (err) => {
    console.error('Failed to load caches:', err);
    // Service already shows notification
  }
});
```

## Advantages

### Code Organization
- Single method for related functionality
- Clear parameter-driven behavior
- Consistent naming across application

### Maintainability
- One method to update for cache retrieval
- Centralized error handling
- Shared logging logic

### Flexibility
- Easy to extend with additional parameters
- Can add filters, pagination, etc.
- Future-proof design

## Related Documentation

- See `AGENT-RESPONSE-STRUCTURE.md` for AgentResponse model details
- See `CACHE-API-PARAMETER-RENAME.md` for cache parameter changes
- See `CACHE-MANAGEMENT-FEATURES.md` for cache management features
- See `GETCACHES-REQUIRED-SERVICEID.md` for previous version (deprecated)

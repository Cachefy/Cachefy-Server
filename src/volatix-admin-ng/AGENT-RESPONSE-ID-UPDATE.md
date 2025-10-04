# AgentResponse ID Parameter Update

## Overview
Added "id" property to AgentResponse model and updated the cache detail feature to pass this ID in the API request.

## Changes Made

### 1. AgentResponse Model (`agent-response.model.ts`)

**Added id property:**
```typescript
export interface AgentResponse {
  id: string;  // NEW PROPERTY
  parametersDetails: ParametersDetails[];
  cacheKeys: string[];
  cacheResult: any;
}
```

### 2. DataService (`data.ts`)

**Updated getCacheByKey method signature:**
```typescript
// Before
getCacheByKey(serviceId: string, key: string): Observable<any>

// After
getCacheByKey(serviceId: string, key: string, id?: string): Observable<any>
```

**Updated API URL construction:**
```typescript
getCacheByKey(serviceId: string, key: string, id?: string): Observable<any> {
  let url = `${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}`;
  if (id) {
    url += `&id=${id}`;  // Append id parameter if provided
  }
  
  return this.http.get<any>(url, {
    headers: this.getAuthHeaders(),
  })
  // ... rest of implementation
}
```

**API Endpoint Examples:**
- Without ID: `GET /api/caches?serviceId=svc123&key=cache-key-1`
- With ID: `GET /api/caches?serviceId=svc123&key=cache-key-1&id=agent-response-id`

### 3. Service Detail Component (`service-detail.ts`)

**Added new signal:**
```typescript
currentAgentResponseId = signal<string>('');
```

**Updated openCacheDetail method:**
```typescript
// Before
openCacheDetail(cacheKey: string) {
  // ...
  this.dataService.getCacheByKey(service.id!, cacheKey).subscribe({
    // ...
  });
}

// After
openCacheDetail(cacheKey: string, agentResponseId: string) {
  // ...
  this.currentAgentResponseId.set(agentResponseId);
  this.dataService.getCacheByKey(service.id!, cacheKey, agentResponseId).subscribe({
    // ...
  });
}
```

**Updated closeCacheDetailModal:**
```typescript
closeCacheDetailModal() {
  this.cacheDetailModalOpen.set(false);
  this.cacheDetailData.set(null);
  this.currentCacheKey.set('');
  this.currentAgentResponseId.set('');  // Reset agent response ID
}
```

### 4. Service Detail HTML Template (`service-detail.html`)

**Updated Details button click handler:**
```html
<!-- Before -->
<button (click)="openCacheDetail(cacheName)">Details</button>

<!-- After -->
<button (click)="openCacheDetail(cacheName, agentResponse.id)">Details</button>
```

## API Request Flow

### When Details Button is Clicked:

1. **User Action**: Clicks "Details" button for a cache
2. **Component**: Calls `openCacheDetail(cacheName, agentResponse.id)`
3. **Signal Updates**:
   - `currentCacheKey.set(cacheName)`
   - `currentAgentResponseId.set(agentResponseId)`
   - `cacheDetailModalOpen.set(true)`
   - `cacheDetailLoading.set(true)`

4. **API Call**: `dataService.getCacheByKey(serviceId, cacheKey, agentResponseId)`
5. **URL Construction**:
   ```
   GET /api/caches?serviceId={serviceId}&key={cacheKey}&id={agentResponseId}
   ```

6. **Response Handling**:
   - Success: Display cache data in modal
   - Error: Log error and stop loading

### Example API Request:
```
GET /api/caches?serviceId=service-123&key=cache-key-456&id=agent-response-789
```

## Backend Requirements

The backend API should:
1. Accept the `id` parameter in the query string
2. Use the `id` to filter/scope the cache data to a specific agent response
3. Return the cache data specific to that agent response ID

**Expected Backend Logic:**
```csharp
// C# Example
[HttpGet]
public IActionResult GetCache(
    [FromQuery] string serviceId,
    [FromQuery] string key,
    [FromQuery] string? id = null)  // Optional id parameter
{
    if (!string.IsNullOrEmpty(id))
    {
        // Filter cache by agent response ID
        var cache = _cacheService.GetCacheByServiceKeyAndId(serviceId, key, id);
        return Ok(cache);
    }
    else
    {
        // Return cache without filtering by ID
        var cache = _cacheService.GetCacheByServiceKey(serviceId, key);
        return Ok(cache);
    }
}
```

## Data Structure

### AgentResponse Structure:
```json
{
  "id": "agent-response-123",
  "parametersDetails": [
    {
      "name": "Parameter Group 1",
      "parameters": {
        "key1": "value1",
        "key2": "value2"
      }
    }
  ],
  "cacheKeys": [
    "cache-key-1",
    "cache-key-2",
    "cache-key-3"
  ],
  "cacheResult": {
    "data": "...",
    "timestamp": "2025-10-04T..."
  }
}
```

### Cache Detail Request/Response Flow:
```
Request:
  GET /api/caches?serviceId=svc-1&key=cache-key-1&id=agent-response-123

Response:
  {
    "key": "cache-key-1",
    "value": { /* cache data */ },
    "ttl": 3600,
    "createdAt": "2025-10-04T10:00:00Z",
    "agentResponseId": "agent-response-123"
  }
```

## Benefits

1. **Precise Cache Filtering**: Can retrieve cache data specific to an agent response
2. **Better Data Isolation**: Each agent response's caches are properly scoped
3. **Backward Compatible**: ID parameter is optional, existing calls still work
4. **Detailed Logging**: Log messages include agent response ID when provided
5. **Clear Data Relationship**: Explicit link between cache and agent response

## Testing Checklist

- [x] AgentResponse model includes id property
- [x] getCacheByKey accepts optional id parameter
- [x] URL is constructed correctly with id parameter
- [x] URL is constructed correctly without id parameter (backward compatible)
- [x] openCacheDetail passes agentResponse.id from template
- [x] Modal opens with correct cache data
- [x] currentAgentResponseId signal is set and cleared properly
- [x] No TypeScript compilation errors

## Migration Notes

### For Backend API:
1. Update the `/api/caches` endpoint to accept optional `id` query parameter
2. Filter cache results by agent response ID when provided
3. Maintain backward compatibility (id parameter is optional)
4. Test both scenarios:
   - With id: `?serviceId=x&key=y&id=z`
   - Without id: `?serviceId=x&key=y`

### For Frontend:
✅ All changes are complete and backward compatible
✅ The id parameter is optional in the DataService method
✅ Existing functionality remains unchanged

## Future Enhancements

- [ ] Add agent response ID to modal title or metadata display
- [ ] Show which agent response a cache belongs to in the modal
- [ ] Add filtering/grouping by agent response ID in cache lists
- [ ] Cache the agent response ID for quick lookups
- [ ] Add breadcrumb showing: Service → Agent Response → Cache

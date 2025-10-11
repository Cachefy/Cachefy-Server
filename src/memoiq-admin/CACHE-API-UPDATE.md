# Cache API Endpoint Update

## Overview

Updated the `getCachesForService()` method in the DataService to use the new API endpoint format that returns an object with a `CacheKeys` property.

## Changes Made

### Data Service (`src/app/core/services/data.ts`)

#### Updated `getCachesForService()` Method

**Old Implementation:**

```typescript
getCachesForService(serviceId: string): Observable<string[]> {
  return this.http
    .get<string[]>(`${environment.apiUrl}/services/${serviceId}/caches`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap((cacheNames) => {
        this.addLog(`Loaded ${cacheNames.length} caches for service ${serviceId}`);
      }),
      catchError((err) => {
        this.addLog(`Error loading caches for service ${serviceId}: ${err.message}`);
        this.notificationService.showError('Failed to load service caches', err.message);
        return of([]);
      })
    );
}
```

**New Implementation:**

```typescript
getCachesForService(serviceId: string): Observable<string[]> {
  return this.http
    .get<{ cacheKeys: string[] }>(`${environment.apiUrl}/caches/${serviceId}`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      map((response) => {
        const cacheKeys = response.cacheKeys || [];
        this.addLog(`Loaded ${cacheKeys.length} caches for service ${serviceId}`);
        return cacheKeys;
      }),
      catchError((err) => {
        this.addLog(`Error loading caches for service ${serviceId}: ${err.message}`);
        this.notificationService.showError('Failed to load service caches', err.message);
        return of([]);
      })
    );
}
```

## Key Changes

1. **Endpoint URL Changed:**

   - Old: `GET /api/services/{serviceId}/caches`
   - New: `GET /api/caches/{serviceId}`

2. **Response Type:**

   - Old: Direct array `string[]`
   - New: Object with property `{ cacheKeys: string[] }`

3. **Response Handling:**
   - Added `map()` operator to extract `cacheKeys` from response object
   - Added null/undefined check with fallback to empty array: `response.cacheKeys || []`
   - Changed from `tap()` to `map()` to transform the response

## API Contract

### Endpoint

**GET** `/api/caches/{serviceId}`

### Request

- **Method:** GET
- **URL Parameter:** `serviceId` - The ID of the service
- **Headers:** `Authorization: Bearer {token}`

### Response

```json
{
  "cacheKeys": ["cache-name-1", "cache-name-2", "cache-name-3"]
}
```

### Response Properties

- `cacheKeys` (required): `List<string>` - Array of cache key names for the service

## Components Affected

### 1. Service Detail Component

- Uses `getCachesForService()` to display caches for a specific service
- No changes needed - still receives `string[]` from the method
- Location: `src/app/features/services/service-detail/service-detail.ts`

### 2. Dashboard Component (if applicable)

- Any component using `getCachesForService()` will work without changes
- The method still returns `Observable<string[]>`

## Testing Checklist

### Service Details Page

- [ ] Navigate to a service detail page (e.g., `/service/auth-service`)
- [ ] Verify "Caches for this service" section displays
- [ ] Verify cache names are loaded from API
- [ ] Check browser network tab:
  - Endpoint: `GET /api/caches/{serviceId}`
  - Response has `cacheKeys` property
- [ ] Verify cache names display correctly in the table

### Error Handling

- [ ] Test with invalid service ID
- [ ] Test with API offline
- [ ] Verify error notification displays
- [ ] Verify empty state shows when no caches exist

### Flush Caches Functionality

- [ ] Click "Flush All Caches" button
- [ ] Verify caches reload after flush
- [ ] Verify new cache list is fetched with updated endpoint

## Backend Implementation Required

Your .NET API should return:

```csharp
public class CacheResponse
{
    public List<string> CacheKeys { get; set; }
}

// Controller endpoint
[HttpGet("caches/{serviceId}")]
public ActionResult<CacheResponse> GetCachesForService(string serviceId)
{
    var cacheKeys = _cacheService.GetCacheKeysForService(serviceId);
    return Ok(new CacheResponse
    {
        CacheKeys = cacheKeys
    });
}
```

## Notes

- The method signature remains the same: `Observable<string[]>`
- Components consuming this method don't need any changes
- The change is backward compatible from the consumer's perspective
- Error handling includes fallback to empty array if `cacheKeys` is null/undefined
- Logging and notifications remain consistent with previous implementation

## Migration Path

No migration needed for existing components. The change is internal to the DataService and transparent to consumers.

## Rollback

If needed, rollback involves:

1. Reverting the endpoint URL back to `/api/services/{serviceId}/caches`
2. Changing response type from object to direct array
3. Replacing `map()` with `tap()` operator

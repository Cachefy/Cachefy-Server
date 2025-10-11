# Cache API Query Parameters Update

## Overview

Updated all cache-related API endpoints to use query parameters instead of path parameters for better RESTful design and easier parameter handling.

## Changes Made

### Data Service (`src/app/core/services/data.ts`)

#### 1. getCachesForService()

**Old Endpoint (Path Parameters):**

```typescript
GET ${environment.apiUrl}/caches/${serviceId}
```

**New Endpoint (Query Parameters):**

```typescript
GET ${environment.apiUrl}/caches?serviceId=${serviceId}
```

**Full Method:**

```typescript
getCachesForService(serviceId: string): Observable<string[]> {
  return this.http
    .get<Array<{ cacheKeys: string[] }>>(`${environment.apiUrl}/caches?serviceId=${serviceId}`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      map((response) => {
        const cacheKeys = response?.[0]?.cacheKeys || [];
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

#### 2. clearCache()

**Old Endpoint (Path Parameters):**

```typescript
DELETE ${environment.apiUrl}/caches/${serviceId}/${cacheName}/flush
```

**New Endpoint (Query Parameters):**

```typescript
DELETE ${environment.apiUrl}/caches/flush?serviceId=${serviceId}&cacheName=${cacheName}
```

**Full Method:**

```typescript
clearCache(serviceId: string, cacheName: string): Observable<void> {
  return this.http
    .delete<void>(`${environment.apiUrl}/caches/flush?serviceId=${serviceId}&cacheName=${cacheName}`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap(() => {
        this.addLog(`Cleared cache: ${cacheName}`);
        this.notificationService.showSuccess(
          'Cache Cleared',
          `Cache "${cacheName}" has been cleared`
        );
      }),
      catchError((err) => {
        this.addLog(`Error clearing cache ${cacheName}: ${err.message}`);
        this.notificationService.showError('Failed to clear cache', err.message);
        throw err;
      })
    );
}
```

#### 3. flushServiceCaches()

**Old Endpoint (Path Parameters):**

```typescript
POST ${environment.apiUrl}/Caches/${serviceId}/flush
```

**New Endpoint (Query Parameters):**

```typescript
POST ${environment.apiUrl}/caches/flush?serviceId=${serviceId}
```

**Full Method:**

```typescript
flushServiceCaches(serviceId: string): Observable<void> {
  return this.http
    .post<void>(
      `${environment.apiUrl}/caches/flush?serviceId=${serviceId}`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    )
    .pipe(
      tap(() => {
        this.addLog(`Flushed all caches for service: ${serviceId}`);
        this.notificationService.showSuccess(
          'Caches Flushed',
          `All caches for service have been flushed`
        );
      }),
      catchError((err) => {
        this.addLog(`Error flushing caches for service ${serviceId}: ${err.message}`);
        this.notificationService.showError('Failed to flush caches', err.message);
        throw err;
      })
    );
}
```

#### 4. deleteCache()

**Old Endpoint (Path Parameters):**

```typescript
DELETE ${environment.apiUrl}/caches/${serviceId}/${name}/flush
```

**New Endpoint (Query Parameters):**

```typescript
DELETE ${environment.apiUrl}/caches/flush?serviceId=${serviceId}&cacheName=${name}
```

**Full Method:**

```typescript
async deleteCache(name: string, serviceId: string): Promise<void> {
  const confirmed = await this.confirmationService.confirmDelete(`Cache "${name}"`);

  if (!confirmed) {
    return;
  }

  try {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/caches/flush?serviceId=${serviceId}&cacheName=${name}`, {
        headers: this.getAuthHeaders(),
      })
    );

    const deletedCache = this.caches().find((c) => c.name === name && c.serviceId === serviceId);
    const caches = this.caches().filter((c) => !(c.name === name && c.serviceId === serviceId));

    this.caches.set(caches);

    if (deletedCache) {
      this.addLog(`Deleted cache: ${deletedCache.name}`);
      this.notificationService.showDeleteSuccess(`Cache "${deletedCache.name}"`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.notificationService.showDeleteError(`Cache "${name}"`, errorMessage);
    this.addLog(`Error deleting cache: ${errorMessage}`);
  }
}
```

## API Endpoint Summary

### Before (Path Parameters)

| Operation    | Method | Endpoint                                    |
| ------------ | ------ | ------------------------------------------- |
| Get Caches   | GET    | `/api/caches/{serviceId}`                   |
| Clear Cache  | DELETE | `/api/caches/{serviceId}/{cacheName}/flush` |
| Flush All    | POST   | `/api/Caches/{serviceId}/flush`             |
| Delete Cache | DELETE | `/api/caches/{serviceId}/{name}/flush`      |

### After (Query Parameters)

| Operation    | Method | Endpoint                                                        |
| ------------ | ------ | --------------------------------------------------------------- |
| Get Caches   | GET    | `/api/caches?serviceId={serviceId}`                             |
| Clear Cache  | DELETE | `/api/caches/flush?serviceId={serviceId}&cacheName={cacheName}` |
| Flush All    | POST   | `/api/caches/flush?serviceId={serviceId}`                       |
| Delete Cache | DELETE | `/api/caches/flush?serviceId={serviceId}&cacheName={name}`      |

## Benefits of Query Parameters

### 1. **Cleaner URLs**

- Single endpoint path for related operations
- Parameters are clearly separated from the resource path
- Easier to read and understand

### 2. **Better Caching**

- Query parameters work better with HTTP caching mechanisms
- CDN and proxy caching is more straightforward

### 3. **Easier Parameter Handling**

- No need to URL-encode special characters in path segments
- Parameters can be optional without breaking the URL structure
- Easier to add additional parameters in the future

### 4. **Standard RESTful Pattern**

- Query parameters for filtering/searching is a common pattern
- Follows REST best practices for resource filtering

### 5. **Simpler Routing**

- Backend routing is simpler with fewer path variables
- Single route handles multiple parameter combinations

## Backend Implementation Required

### .NET Controller Examples

#### Get Caches for Service

```csharp
[HttpGet("caches")]
public async Task<ActionResult<List<CacheResponse>>> GetCachesForService(
    [FromQuery] string serviceId)
{
    var cacheKeys = await _cacheService.GetCacheKeysAsync(serviceId);
    return Ok(new List<CacheResponse>
    {
        new CacheResponse { CacheKeys = cacheKeys }
    });
}
```

#### Clear Specific Cache

```csharp
[HttpDelete("caches/flush")]
public async Task<IActionResult> ClearCache(
    [FromQuery] string serviceId,
    [FromQuery] string cacheName)
{
    await _cacheService.ClearCacheAsync(serviceId, cacheName);
    return NoContent();
}
```

#### Flush All Service Caches

```csharp
[HttpPost("caches/flush")]
public async Task<IActionResult> FlushServiceCaches(
    [FromQuery] string serviceId)
{
    await _cacheService.FlushAllCachesAsync(serviceId);
    return NoContent();
}
```

## URL Examples

### Get Caches

```
GET /api/caches?serviceId=auth-service
```

### Clear Specific Cache

```
DELETE /api/caches/flush?serviceId=auth-service&cacheName=SessionHistory
```

### Flush All Caches

```
POST /api/caches/flush?serviceId=auth-service
```

## Component Usage

No changes required in components (ServiceDetail, Dashboard) since they call the DataService methods which now handle the query parameters internally.

### Example Usage (No Changes Needed)

```typescript
// Service Detail Component
this.dataService.clearCache(service.id!, cacheKey).subscribe({
  // ...
});

// Dashboard Component
this.dataService.clearCache(cache.serviceId, cache.name).subscribe({
  // ...
});
```

## Testing Checklist

### Service Details Page

- [ ] Navigate to service detail page
- [ ] Verify caches load correctly
- [ ] Check network tab: `GET /api/caches?serviceId={id}`
- [ ] Click "Remove" on a cache
- [ ] Check network tab: `DELETE /api/caches/flush?serviceId={id}&cacheName={name}`
- [ ] Verify cache is removed

### Dashboard Page

- [ ] Navigate to dashboard
- [ ] Verify "All Caches" table loads
- [ ] Click "Clear" on a cache
- [ ] Check network tab: `DELETE /api/caches/flush?serviceId={id}&cacheName={name}`
- [ ] Verify cache is cleared

### Flush All Caches

- [ ] Go to service detail page
- [ ] Click "Flush All Caches" button
- [ ] Check network tab: `POST /api/caches/flush?serviceId={id}`
- [ ] Verify all caches are flushed

### Special Characters

- [ ] Test with cache names containing special characters
- [ ] Verify URL encoding works correctly
- [ ] Test with serviceId containing special characters

### Error Scenarios

- [ ] Test with invalid serviceId
- [ ] Test with invalid cacheName
- [ ] Test with API offline
- [ ] Verify error messages display correctly

## URL Encoding

Angular's HttpClient automatically encodes query parameters, so special characters are handled correctly:

```typescript
// If cacheName = "My Cache/Test"
// URL becomes: /api/caches/flush?serviceId=auth&cacheName=My%20Cache%2FTest
```

## Migration Notes

### Breaking Changes

- Backend API must be updated to accept query parameters
- Old path-based endpoints will no longer work

### Backward Compatibility

Not applicable - this is a breaking change. Both frontend and backend must be updated together.

### Deployment Strategy

1. Update backend API to support query parameters
2. Deploy backend changes
3. Deploy frontend changes
4. Verify all cache operations work correctly

## Advantages Over Path Parameters

### Path Parameters (Old)

```
DELETE /api/caches/auth-service/SessionHistory/flush
```

- Harder to read with multiple parameters
- Special characters need encoding in path
- Limited flexibility for optional parameters
- Longer URLs

### Query Parameters (New)

```
DELETE /api/caches/flush?serviceId=auth-service&cacheName=SessionHistory
```

- Clear separation of resource and parameters
- Natural place for optional parameters
- Standard pattern for filtering/searching
- Easier to extend

## Future Enhancements

With query parameters, it's easy to add:

1. **Filtering Options**

   ```
   GET /api/caches?serviceId=auth&status=active&minSize=1000
   ```

2. **Pagination**

   ```
   GET /api/caches?serviceId=auth&page=1&pageSize=20
   ```

3. **Sorting**

   ```
   GET /api/caches?serviceId=auth&sortBy=name&order=asc
   ```

4. **Multiple Services**
   ```
   GET /api/caches?serviceId=auth,payment,order
   ```

## Rollback Plan

If needed, rollback involves:

1. Revert all four methods in DataService
2. Change query parameter URLs back to path parameter URLs
3. Update backend to use path parameters again
4. Deploy both changes together

## Related Documentation

- See `CACHE-API-UPDATE.md` for previous cache API changes
- See `CACHE-MANAGEMENT-FEATURES.md` for overall cache feature documentation
- See `REMOVE-CACHE-BY-KEY-FEATURE.md` for remove cache functionality

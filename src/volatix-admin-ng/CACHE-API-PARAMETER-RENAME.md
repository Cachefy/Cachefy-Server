# Cache API Parameter Rename - `cacheName` to `key`

## Overview

Updated all cache-related API methods to use `key` instead of `cacheName` as the parameter name for consistency and clarity. Also added a new `getCacheByKey()` method to retrieve a specific cache entry.

## Changes Made

### 1. Added `getCacheByKey()` Method

**New Method:**

```typescript
getCacheByKey(serviceId: string, key: string): Observable<any> {
  return this.http
    .get<any>(`${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      map((response) => {
        this.addLog(`Loaded cache ${key} for service ${serviceId}`);
        return response;
      }),
      catchError((err) => {
        this.addLog(`Error loading cache ${key} for service ${serviceId}: ${err.message}`);
        this.notificationService.showError('Failed to load cache', err.message);
        throw err;
      })
    );
}
```

**Purpose:**

- Retrieves a specific cache entry by key for a given service
- Returns the full cache data (not just the list of keys)
- Uses query parameters: `?serviceId={serviceId}&key={key}`

**Use Cases:**

- Viewing cache details
- Inspecting cache contents
- Debugging cache issues

### 2. Updated `clearCache()` Method

**Before:**

```typescript
clearCache(serviceId: string, cacheName: string): Observable<void>
```

**After:**

```typescript
clearCache(serviceId: string, key: string): Observable<void>
```

**Endpoint Changed:**

```typescript
// Before
DELETE ${environment.apiUrl}/caches?serviceId=${serviceId}&cacheName=${cacheName}

// After
DELETE ${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}
```

**Full Method:**

```typescript
clearCache(serviceId: string, key: string): Observable<void> {
  return this.http
    .delete<void>(`${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap(() => {
        this.addLog(`Cleared cache: ${key}`);
        this.notificationService.showSuccess(
          'Cache Cleared',
          `Cache "${key}" has been cleared`
        );
      }),
      catchError((err) => {
        this.addLog(`Error clearing cache ${key}: ${err.message}`);
        this.notificationService.showError('Failed to clear cache', err.message);
        throw err;
      })
    );
}
```

### 3. Updated `deleteCache()` Method

**Before:**

```typescript
deleteCache(name: string, serviceId: string): Promise<void>
```

**After:**

```typescript
deleteCache(key: string, serviceId: string): Promise<void>
```

**Endpoint Changed:**

```typescript
// Before
DELETE ${environment.apiUrl}/caches/flush?serviceId=${serviceId}&cacheName=${name}

// After
DELETE ${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}
```

**Full Method:**

```typescript
async deleteCache(key: string, serviceId: string): Promise<void> {
  const confirmed = await this.confirmationService.confirmDelete(`Cache "${key}"`);

  if (!confirmed) {
    return;
  }

  try {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}`, {
        headers: this.getAuthHeaders(),
      })
    );

    // Update local caches signal
    const deletedCache = this.caches().find((c) => c.name === key && c.serviceId === serviceId);
    const caches = this.caches().filter((c) => !(c.name === key && c.serviceId === serviceId));

    this.caches.set(caches);

    if (deletedCache) {
      this.addLog(`Deleted cache: ${deletedCache.name}`);
      this.notificationService.showDeleteSuccess(`Cache "${deletedCache.name}"`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.notificationService.showDeleteError(`Cache "${key}"`, errorMessage);
    this.addLog(`Error deleting cache: ${errorMessage}`);
  }
}
```

## API Endpoint Summary

### Updated Endpoints

| Operation            | Method | Old Endpoint                                        | New Endpoint                             |
| -------------------- | ------ | --------------------------------------------------- | ---------------------------------------- |
| **Get Cache by Key** | GET    | N/A (new)                                           | `/api/caches?serviceId={id}&key={key}`   |
| **Clear Cache**      | DELETE | `/api/caches?serviceId={id}&cacheName={name}`       | `/api/caches?serviceId={id}&key={key}`   |
| **Delete Cache**     | DELETE | `/api/caches/flush?serviceId={id}&cacheName={name}` | `/api/caches?serviceId={id}&key={key}`   |
| **Get Caches**       | GET    | `/api/caches?serviceId={id}`                        | `/api/caches?serviceId={id}` (no change) |
| **Flush All**        | DELETE | `/api/caches?serviceId={id}`                        | `/api/caches?serviceId={id}` (no change) |

### Endpoint Consolidation

Notice that `clearCache` and `deleteCache` now use the same endpoint:

```
DELETE /api/caches?serviceId={id}&key={key}
```

Both operations remove a cache entry, so using the same endpoint is logical and RESTful.

## Parameter Name Rationale

### Why `key` instead of `cacheName`?

1. **Shorter and Clearer**

   - `key` is more concise than `cacheName`
   - In cache context, "key" is universally understood

2. **Industry Standard**

   - Most caching libraries use "key" terminology (Redis, Memcached, etc.)
   - Developers are familiar with cache key terminology

3. **Consistent with Cache Terminology**

   - Caches store key-value pairs
   - The parameter represents the key, not necessarily a "name"

4. **Simpler API Design**
   - Fewer characters in URLs
   - Easier to type and remember

## Component Usage

### No Changes Required in Components

The components (`dashboard.ts`, `service-detail.ts`) already pass the correct parameters in the correct order:

```typescript
// Dashboard Component
this.dataService.clearCache(cache.serviceId, cache.name).subscribe({
  // ...
});

// Service Detail Component
this.dataService.clearCache(service.id!, cacheKey).subscribe({
  // ...
});
```

The parameter is still called `cache.name` or `cacheKey` in the components, but the DataService method now expects it as `key`, which is fine - the variable name in the calling code doesn't need to match the parameter name in the method signature.

## Backend Implementation Required

### .NET Controller Updates

#### 1. Get Cache by Key

```csharp
[HttpGet("caches")]
public async Task<ActionResult<CacheEntry>> GetCacheByKey(
    [FromQuery] string serviceId,
    [FromQuery] string? key = null)
{
    // If key is provided, return specific cache entry
    if (!string.IsNullOrEmpty(key))
    {
        var cacheEntry = await _cacheService.GetCacheByKeyAsync(serviceId, key);
        if (cacheEntry == null)
            return NotFound();
        return Ok(cacheEntry);
    }

    // Otherwise, return list of cache keys (existing behavior)
    var cacheKeys = await _cacheService.GetCacheKeysAsync(serviceId);
    return Ok(new List<CacheResponse>
    {
        new CacheResponse { CacheKeys = cacheKeys }
    });
}
```

#### 2. Clear/Delete Cache (Consolidated)

```csharp
[HttpDelete("caches")]
public async Task<IActionResult> DeleteCache(
    [FromQuery] string serviceId,
    [FromQuery] string? key = null)
{
    // If key is provided, delete specific cache
    if (!string.IsNullOrEmpty(key))
    {
        await _cacheService.DeleteCacheAsync(serviceId, key);
        return NoContent();
    }

    // Otherwise, flush all caches for service
    await _cacheService.FlushAllCachesAsync(serviceId);
    return NoContent();
}
```

### Response Models

```csharp
public class CacheEntry
{
    public string Key { get; set; }
    public object Value { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public long Size { get; set; }
    public int HitCount { get; set; }
}

public class CacheResponse
{
    public List<string> CacheKeys { get; set; }
}
```

## URL Examples

### Get All Cache Keys for Service

```
GET /api/caches?serviceId=auth-service
```

### Get Specific Cache Entry

```
GET /api/caches?serviceId=auth-service&key=SessionHistory
```

### Clear Specific Cache

```
DELETE /api/caches?serviceId=auth-service&key=SessionHistory
```

### Flush All Caches

```
DELETE /api/caches?serviceId=auth-service
```

## Benefits of Changes

### 1. Consistent Naming

- All cache operations now use `key` parameter
- Matches industry standards and cache terminology
- Easier for developers to understand and remember

### 2. Simpler API Design

- Shorter parameter names
- Cleaner URLs
- Less verbose code

### 3. Endpoint Consolidation

- `clearCache` and `deleteCache` use same endpoint
- Reduced API surface area
- More RESTful design

### 4. New Functionality

- `getCacheByKey()` enables viewing cache contents
- Useful for debugging and monitoring
- Can inspect individual cache entries

### 5. Better Developer Experience

- Familiar terminology from other caching systems
- Intuitive method names
- Clear separation of concerns

## Migration Notes

### Breaking Changes

- Backend API must update parameter names from `cacheName` to `key`
- Both frontend and backend must be deployed together

### No Frontend Component Changes

- Components don't need updates
- Internal parameter naming in components can stay the same
- Only DataService method signatures changed

### Backward Compatibility

Not applicable - this is a breaking change requiring coordinated deployment.

## Testing Checklist

### Get Cache by Key

- [ ] Call `getCacheByKey()` with valid serviceId and key
- [ ] Verify correct cache data is returned
- [ ] Check network tab: `GET /api/caches?serviceId={id}&key={key}`
- [ ] Test with non-existent key (should error gracefully)
- [ ] Test with special characters in key

### Clear Cache

- [ ] Clear a cache using dashboard
- [ ] Verify endpoint uses `key` parameter: `DELETE /api/caches?serviceId={id}&key={key}`
- [ ] Confirm cache is cleared successfully
- [ ] Verify success notification appears

### Delete Cache

- [ ] Delete a cache from service details
- [ ] Verify endpoint uses `key` parameter: `DELETE /api/caches?serviceId={id}&key={key}`
- [ ] Confirm cache is removed
- [ ] Verify confirmation modal works

### Parameter Names

- [ ] Verify all cache operations use consistent parameter naming
- [ ] Check that `key` parameter is used instead of `cacheName`
- [ ] Ensure all endpoints are called correctly

## Related Documentation

- See `CACHE-API-QUERY-PARAMS-UPDATE.md` for query parameter migration
- See `CLEAR-CACHE-API-UPDATE.md` for clearCache signature changes
- See `REMOVE-CACHE-BY-KEY-FEATURE.md` for remove cache functionality
- See `CACHE-MANAGEMENT-FEATURES.md` for overall cache features

## Future Enhancements

With the new `getCacheByKey()` method, we can:

1. **Cache Inspector UI**

   - View cache contents in detail
   - Display cache metadata (size, TTL, hits)
   - Show expiration times

2. **Cache Analytics**

   - Track cache hit/miss ratios
   - Monitor cache sizes
   - Analyze cache performance

3. **Cache Editing**

   - Update cache values
   - Modify TTL settings
   - Edit cache metadata

4. **Cache Search**
   - Search within cache values
   - Filter caches by criteria
   - Advanced cache queries

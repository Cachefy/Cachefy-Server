# Clear Cache API Update - ServiceId Parameter

## Overview

Updated the `clearCache()` method to accept both `serviceId` and `cacheName` parameters to match the API endpoint structure.

## Changes Made

### 1. Data Service (`src/app/core/services/data.ts`)

#### Updated `clearCache()` Method Signature

**Old Signature:**

```typescript
clearCache(cacheName: string): Observable<void>
```

**New Signature:**

```typescript
clearCache(serviceId: string, cacheName: string): Observable<void>
```

#### Updated API Endpoint

**Old Endpoint:**

```typescript
DELETE ${environment.apiUrl}/caches/${cacheName}/clear
```

**New Endpoint:**

```typescript
DELETE ${environment.apiUrl}/caches/${serviceId}/${cacheName}/flush
```

#### Complete Updated Method

```typescript
clearCache(serviceId: string, cacheName: string): Observable<void> {
  return this.http
    .delete<void>(`${environment.apiUrl}/caches/${serviceId}/${cacheName}/flush`, {
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

### 2. Service Detail Component (`src/app/features/services/service-detail/service-detail.ts`)

#### Updated `removeCacheByKey()` Method Call

**Old Call:**

```typescript
this.dataService.clearCache(cacheKey).subscribe({
  // ...
});
```

**New Call:**

```typescript
this.dataService.clearCache(service.id!, cacheKey).subscribe({
  // ...
});
```

#### Complete Updated Method

```typescript
async removeCacheByKey(cacheKey: string) {
  const service = this.service();
  if (!service) return;

  const confirmed = await this.confirmationService.confirm({
    title: 'Remove Cache',
    message: `Are you sure you want to remove the cache "${cacheKey}"? This action cannot be undone.`,
    confirmText: 'Remove',
    cancelText: 'Cancel',
    type: 'warning',
  });

  if (!confirmed) return;

  this.removingCache.set(cacheKey);

  this.dataService.clearCache(service.id!, cacheKey).subscribe({
    next: () => {
      // Reload caches after removal
      this.loadCachesForService(service.id!);
      this.removingCache.set(null);
    },
    error: () => {
      this.removingCache.set(null);
    },
  });
}
```

### 3. Dashboard Component (`src/app/features/dashboard/dashboard.ts`)

#### Updated `clearCache()` Method Call

**Old Call:**

```typescript
this.dataService.clearCache(cache.name).subscribe({
  // ...
});
```

**New Call:**

```typescript
this.dataService.clearCache(cache.serviceId, cache.name).subscribe({
  // ...
});
```

#### Complete Updated Method

```typescript
async clearCache(cache: Cache) {
  const confirmed = await this.confirmationService.confirm({
    title: 'Clear Cache',
    message: `Are you sure you want to clear the cache "${cache.name}"? This action cannot be undone.`,
    confirmText: 'Clear Cache',
    cancelText: 'Cancel',
    type: 'warning',
  });

  if (!confirmed) return;

  this.clearingCache.set(cache.name);

  this.dataService.clearCache(cache.serviceId, cache.name).subscribe({
    next: () => {
      // Reload caches after clearing
      this.loadData();
      this.clearingCache.set(null);
    },
    error: () => {
      this.clearingCache.set(null);
    },
  });
}
```

## API Contract

### Endpoint

**DELETE** `/api/caches/{serviceId}/{cacheName}/flush`

### Request

- **Method:** DELETE
- **URL Parameters:**
  - `serviceId` - The ID of the service that owns the cache
  - `cacheName` - The name of the cache to clear
- **Headers:** `Authorization: Bearer {token}`

### Response

- **Success:** 204 No Content
- **Error:** 4xx/5xx with error message

### Example

```
DELETE /api/caches/auth-service/SessionHistory/flush
Authorization: Bearer eyJhbGc...
```

## Changes Summary

| Component     | Method               | Change                                   |
| ------------- | -------------------- | ---------------------------------------- |
| DataService   | `clearCache()`       | Added `serviceId` parameter              |
| DataService   | `clearCache()`       | Updated endpoint to include `serviceId`  |
| ServiceDetail | `removeCacheByKey()` | Pass `service.id!` to `clearCache()`     |
| Dashboard     | `clearCache()`       | Pass `cache.serviceId` to `clearCache()` |

## Benefits

1. **More RESTful:** API endpoint now follows proper resource hierarchy
2. **Better Organization:** Cache operations are scoped to services
3. **Consistency:** Matches pattern used in `deleteCache()` and other methods
4. **Clarity:** Endpoint clearly shows which service's cache is being cleared

## Backend Requirements

Your .NET API should implement:

```csharp
[HttpDelete("caches/{serviceId}/{cacheName}/flush")]
public async Task<IActionResult> ClearCache(string serviceId, string cacheName)
{
    await _cacheService.ClearCacheAsync(serviceId, cacheName);
    return NoContent();
}
```

## Testing Checklist

### Service Detail Page

- [ ] Navigate to service detail page (e.g., `/service/auth-service`)
- [ ] Click "Remove" on a cache
- [ ] Confirm removal in modal
- [ ] Check browser network tab:
  - Endpoint: `DELETE /api/caches/{serviceId}/{cacheName}/flush`
  - URL includes both serviceId and cacheName
- [ ] Verify success notification
- [ ] Verify cache is removed from list

### Dashboard Page

- [ ] Navigate to dashboard
- [ ] Find cache in "All Caches" table
- [ ] Click "Clear" button
- [ ] Confirm in modal
- [ ] Check browser network tab:
  - Endpoint: `DELETE /api/caches/{serviceId}/{cacheName}/flush`
  - URL includes both serviceId and cacheName
- [ ] Verify success notification
- [ ] Verify cache list updates

### Error Scenarios

- [ ] Test with invalid serviceId
- [ ] Test with invalid cacheName
- [ ] Test with API offline
- [ ] Verify error notifications display
- [ ] Verify loading states reset on error

## Migration Notes

### Breaking Changes

- The `clearCache()` method signature has changed
- Any code calling `clearCache(cacheName)` must be updated to `clearCache(serviceId, cacheName)`

### Updated Components

✅ DataService
✅ ServiceDetail component
✅ Dashboard component

### No Changes Needed

- Modal components
- Confirmation service
- Notification service
- HTML templates (only TypeScript changes)

## Rollback

If rollback is needed:

1. Revert `clearCache()` signature to single parameter
2. Revert endpoint to `/api/caches/{cacheName}/clear`
3. Update ServiceDetail component call
4. Update Dashboard component call
5. Update backend API endpoint

## Related Methods

Other cache-related methods for reference:

```typescript
// Get caches for service
getCachesForService(serviceId: string): Observable<string[]>
// Endpoint: GET /api/caches/{serviceId}

// Flush all caches for service
flushServiceCaches(serviceId: string): Observable<void>
// Endpoint: POST /api/Caches/{serviceId}/flush

// Delete cache (uses serviceId)
deleteCache(name: string, serviceId: string): Promise<void>
// Endpoint: DELETE /api/caches/{serviceId}/{name}/flush
```

All cache operations now consistently use `serviceId` in their API endpoints.

# Remove Cache by Key Feature

## Overview

Added the ability to remove individual cache entries by key from the service detail page, with confirmation modal and loading state.

## Changes Made

### Service Detail Component (`src/app/features/services/service-detail/`)

#### TypeScript Changes (`service-detail.ts`)

**Added Signal:**

```typescript
removingCache = signal<string | null>(null);
```

- Tracks which cache is currently being removed
- Shows loading state during removal operation
- Null when no operation is in progress

**Added Method:**

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

  this.dataService.clearCache(cacheKey).subscribe({
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

**Method Features:**

1. ✅ Shows confirmation modal before removal
2. ✅ Sets loading state during operation
3. ✅ Calls `clearCache()` API endpoint
4. ✅ Reloads cache list after successful removal
5. ✅ Resets loading state on success or error
6. ✅ Uses existing `dataService.clearCache()` method

#### HTML Changes (`service-detail.html`)

**Updated Cache Table:**

- Added "Actions" column header
- Added "Remove" button for each cache row
- Button shows "Removing..." during operation
- Button is disabled while operation is in progress

**Before:**

```html
<table class="min-w-full table-fixed text-sm">
  <thead>
    <tr class="text-left text-xs text-slate-400 border-b border-slate-800">
      <th class="p-2">Cache Name</th>
    </tr>
  </thead>
  <tbody>
    @for (cacheName of paginatedCaches(); track cacheName) {
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="p-2">{{ cacheName }}</td>
    </tr>
    }
  </tbody>
</table>
```

**After:**

```html
<table class="min-w-full table-fixed text-sm">
  <thead>
    <tr class="text-left text-xs text-slate-400 border-b border-slate-800">
      <th class="p-2">Cache Name</th>
      <th class="p-2 col-actions">Actions</th>
    </tr>
  </thead>
  <tbody>
    @for (cacheName of paginatedCaches(); track cacheName) {
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="p-2">{{ cacheName }}</td>
      <td class="p-2 col-actions">
        <button
          class="btn danger sm btn-ripple"
          (click)="removeCacheByKey(cacheName)"
          [disabled]="removingCache() === cacheName"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          {{ removingCache() === cacheName ? 'Removing...' : 'Remove' }}
        </button>
      </td>
    </tr>
    }
  </tbody>
</table>
```

## User Experience Flow

### 1. Initial State

- Cache table shows all cache keys for the service
- Each row has a "Remove" button
- Button shows trash icon and "Remove" text

### 2. Click Remove Button

- Confirmation modal appears
- **Title:** "Remove Cache"
- **Message:** "Are you sure you want to remove the cache "{cacheName}"? This action cannot be undone."
- **Type:** Warning (yellow/orange theme)
- **Buttons:** "Remove" / "Cancel"

### 3. User Cancels

- Modal closes
- No action taken
- Button returns to normal state

### 4. User Confirms

- Modal closes
- Button changes to "Removing..." state
- Button is disabled
- API call is made to clear the cache

### 5. Success

- Success notification appears: "Cache Cleared - Cache "{cacheName}" has been cleared"
- Cache list is reloaded from API
- Removed cache no longer appears in the list
- Button returns to normal state for remaining caches

### 6. Error

- Error notification appears: "Failed to clear cache - {error message}"
- Cache list remains unchanged
- Button returns to normal state
- User can try again

## API Integration

Uses the existing `clearCache()` method from DataService:

**Endpoint:** `DELETE /api/caches/{cacheName}/clear`

**Headers:** Authorization: Bearer {token}

**Response:** void (204 No Content)

## Visual States

### Normal State

```
| Cache Name                    | Actions       |
|-------------------------------|---------------|
| MnoFeature_Cubic_InternalFeed | [🗑️ Remove]   |
| SessionHistory                | [🗑️ Remove]   |
```

### Removing State

```
| Cache Name                    | Actions          |
|-------------------------------|------------------|
| MnoFeature_Cubic_InternalFeed | [⏳ Removing...] |  ← Disabled
| SessionHistory                | [🗑️ Remove]      |
```

### After Removal

```
| Cache Name                    | Actions       |
|-------------------------------|---------------|
| SessionHistory                | [🗑️ Remove]   |
```

## Confirmation Modal Details

### Modal Configuration

```typescript
{
  title: 'Remove Cache',
  message: `Are you sure you want to remove the cache "${cacheKey}"? This action cannot be undone.`,
  confirmText: 'Remove',
  cancelText: 'Cancel',
  type: 'warning'
}
```

### Modal Appearance

- **Icon:** Warning triangle (⚠️)
- **Color Theme:** Warning (yellow/orange)
- **Backdrop:** Semi-transparent overlay
- **Animation:** Slide in from center
- **Buttons:**
  - Cancel: Secondary style (gray)
  - Remove: Danger style (red)

## Testing Checklist

### Service Details Page

- [ ] Navigate to service detail page (e.g., `/service/auth-service`)
- [ ] Verify cache table has "Actions" column
- [ ] Verify each cache has "Remove" button
- [ ] Click "Remove" on a cache

### Confirmation Modal

- [ ] Verify modal appears with warning icon
- [ ] Verify modal shows cache name in message
- [ ] Verify "Remove" and "Cancel" buttons are present
- [ ] Click "Cancel" - modal closes, no action taken
- [ ] Click "Remove" again

### Remove Operation

- [ ] Verify button changes to "Removing..."
- [ ] Verify button is disabled during operation
- [ ] Check browser network tab:
  - Endpoint: `DELETE /api/caches/{cacheName}/clear`
  - Authorization header present
- [ ] Verify success notification appears
- [ ] Verify cache is removed from list
- [ ] Verify cache count updates

### Multiple Removals

- [ ] Remove another cache
- [ ] Verify only the clicked button shows loading state
- [ ] Verify other buttons remain active
- [ ] Remove all caches one by one
- [ ] Verify "No caches found" message appears when empty

### Error Handling

- [ ] Test with API offline
- [ ] Test with invalid cache key
- [ ] Verify error notification displays
- [ ] Verify button returns to normal state on error
- [ ] Verify cache list doesn't change on error

### Edge Cases

- [ ] Test with single cache (verify removal works)
- [ ] Test with paginated caches (verify removal on page 2+)
- [ ] Test rapid clicks (verify double-click protection)
- [ ] Test with special characters in cache name

## Integration with Existing Features

### Works With:

1. **Flush All Caches** - Can remove individual caches or flush all
2. **Pagination** - Remove buttons work on all pages
3. **Cache Reload** - List updates after removal
4. **Error Handling** - Consistent with other operations

### Consistent Behavior:

- Uses same confirmation service
- Uses same notification service
- Uses same loading state pattern
- Uses same button styles and icons

## Notes

- Cache removal is permanent and cannot be undone
- Removing a cache clears its contents, not just deletes the entry
- Success notification confirms the operation
- Cache list is automatically reloaded after removal
- Loading state prevents duplicate requests
- Each cache can be removed independently
- Works with existing `clearCache()` API endpoint

## Future Enhancements

Potential improvements:

1. Bulk selection for removing multiple caches
2. Cache statistics (size, hit rate) before removal
3. "Undo" functionality with temporary backup
4. Cache preview/inspection before removal
5. Filter/search caches before removing
6. Export cache data before removal

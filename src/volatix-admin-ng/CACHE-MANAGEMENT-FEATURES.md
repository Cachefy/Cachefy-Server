# Cache Management Features

## Overview

Added comprehensive cache management features to the Angular application, including:

1. API integration for getting caches per service (returns array of strings)
2. Clear cache action in the dashboard cache grid
3. Flush all caches button in service details page

## Changes Made

### 1. Data Service (`src/app/core/services/data.ts`)

#### Updated `getCachesForService()` Method

Changed from filtering local cache array to calling API endpoint that returns cache names for a specific service.

**Old Implementation:**

```typescript
getCachesForService(serviceId: string): Observable<Cache[]> {
  return this.getCaches().pipe(
    map((caches) => {
      const filteredCaches = caches.filter((c) => {
        const cSid = String(c.serviceId || '').toLowerCase();
        const target = String(serviceId || '').toLowerCase();
        return cSid === target || (c.serviceName && this.toSlug(c.serviceName) === target);
      });
      this.addLog(`Loaded ${filteredCaches.length} caches for ${serviceId}`);
      return filteredCaches;
    })
  );
}
```

**New Implementation:**

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

#### Added `clearCache()` Method

Clears a specific cache by name.

```typescript
clearCache(cacheName: string): Observable<void> {
  return this.http
    .delete<void>(`${environment.apiUrl}/caches/${cacheName}/clear`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap(() => {
        this.addLog(`Cleared cache: ${cacheName}`);
        this.notificationService.showSuccess('Cache Cleared', `Cache "${cacheName}" has been cleared`);
      }),
      catchError((err) => {
        this.addLog(`Error clearing cache ${cacheName}: ${err.message}`);
        this.notificationService.showError('Failed to clear cache', err.message);
        throw err;
      })
    );
}
```

#### Added `flushServiceCaches()` Method

Flushes all caches for a specific service.

```typescript
flushServiceCaches(serviceId: string): Observable<void> {
  return this.http
    .post<void>(`${environment.apiUrl}/services/${serviceId}/flush-caches`, {}, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap(() => {
        this.addLog(`Flushed all caches for service: ${serviceId}`);
        this.notificationService.showSuccess('Caches Flushed', `All caches for service have been flushed`);
      }),
      catchError((err) => {
        this.addLog(`Error flushing caches for service ${serviceId}: ${err.message}`);
        this.notificationService.showError('Failed to flush caches', err.message);
        throw err;
      })
    );
}
```

### 2. Service Detail Component (`src/app/features/services/service-detail/`)

#### TypeScript Changes (`service-detail.ts`)

**Added Imports:**

```typescript
import { ConfirmationService } from '../../../core/services/confirmation.service';
```

**Updated Properties:**

```typescript
caches = signal<string[]>([]); // Changed from Cache[] to string[]
isFlushingCaches = signal(false); // Added for loading state
```

**Added Methods:**

```typescript
async flushAllCaches() {
  const service = this.service();
  if (!service) return;

  const confirmed = await this.confirmationService.confirm({
    title: 'Flush All Caches',
    message: `Are you sure you want to flush all ${this.caches().length} cache(s) for ${service.name}? This action cannot be undone.`,
    confirmText: 'Flush All',
    cancelText: 'Cancel',
    type: 'warning',
  });

  if (!confirmed) return;

  this.isFlushingCaches.set(true);

  this.dataService.flushServiceCaches(service.id!).subscribe({
    next: () => {
      this.loadCachesForService(service.id!);
      this.isFlushingCaches.set(false);
    },
    error: () => {
      this.isFlushingCaches.set(false);
    },
  });
}

private loadCachesForService(serviceId: string) {
  this.dataService.getCachesForService(serviceId).subscribe((caches) => {
    this.caches.set(caches);
  });
}
```

#### HTML Changes (`service-detail.html`)

**Updated Cache Table:**

- Simplified to show only cache names (array of strings from API)
- Added "Flush All Caches" button with loading state
- Removed detailed cache properties (status, items, TTL, policy) since API returns string[]

```html
<div class="card" style="margin-top: 16px">
  <div
    style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;"
  >
    <h2 class="text-app">Caches for this service</h2>
    @if (caches().length > 0) {
    <button
      class="btn danger sm btn-ripple"
      (click)="flushAllCaches()"
      [disabled]="isFlushingCaches()"
    >
      <svg>...</svg>
      {{ isFlushingCaches() ? 'Flushing...' : 'Flush All Caches' }}
    </button>
    }
  </div>
  @if (paginatedCaches().length > 0) {
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
  ...
</div>
```

### 3. Dashboard Component (`src/app/features/dashboard/`)

#### TypeScript Changes (`dashboard.ts`)

**Added Imports:**

```typescript
import { CommonModule } from '@angular/common';
import { Cache } from '../../core/models/cache.model';
```

**Updated Component:**

```typescript
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],  // Added CommonModule
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
```

**Added Properties:**

```typescript
caches = signal<Cache[]>([]);
clearingCache = signal<string | null>(null);
```

**Updated `loadData()` Method:**

```typescript
loadData() {
  this.dataService.getServices().subscribe(() => {
    this.dataService.getCaches().subscribe((caches) => {
      this.caches.set(caches);  // Store caches
      this.updateMetrics();
    });
  });

  this.logs.set(this.dataService.getLogs());
}
```

**Added `clearCache()` Method:**

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

  this.dataService.clearCache(cache.name).subscribe({
    next: () => {
      this.loadData();
      this.clearingCache.set(null);
    },
    error: () => {
      this.clearingCache.set(null);
    },
  });
}
```

#### HTML Changes (`dashboard.html`)

**Added Cache Grid Table:**

```html
<div class="card" style="margin-top: 16px">
  <h2 class="text-app">All Caches</h2>
  @if (caches().length > 0) {
  <table class="min-w-full table-fixed text-sm">
    <thead>
      <tr class="text-left text-xs text-slate-400 border-b border-slate-800">
        <th class="p-2 w-48">Cache Name</th>
        <th class="p-2 w-48">Service</th>
        <th class="p-2 w-24">Items</th>
        <th class="p-2 w-24">Status</th>
        <th class="p-2 col-actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      @for (cache of caches(); track cache.name + cache.serviceId) {
      <tr class="border-b border-slate-800 hover:bg-slate-800/50">
        <td class="p-2">{{ cache.name }}</td>
        <td class="p-2">{{ cache.serviceName || cache.serviceId || '—' }}</td>
        <td class="p-2">{{ cache.items || 0 }}</td>
        <td class="p-2" style="text-transform: capitalize">{{ cache.status || 'active' }}</td>
        <td class="p-2 col-actions">
          <button
            class="btn danger sm btn-ripple"
            (click)="clearCache(cache)"
            [disabled]="clearingCache() === cache.name"
          >
            <svg>...</svg>
            {{ clearingCache() === cache.name ? 'Clearing...' : 'Clear' }}
          </button>
        </td>
      </tr>
      }
    </tbody>
  </table>
  } @else {
  <div class="text-center text-slate-400 py-8">No caches found</div>
  }
</div>
```

## API Endpoints Required

### 1. Get Caches for Service

- **Endpoint:** `GET /api/services/{serviceId}/caches`
- **Returns:** `string[]` - Array of cache names
- **Headers:** Authorization: Bearer {token}

### 2. Clear Cache

- **Endpoint:** `DELETE /api/caches/{cacheName}/clear`
- **Returns:** `void`
- **Headers:** Authorization: Bearer {token}

### 3. Flush Service Caches

- **Endpoint:** `POST /api/services/{serviceId}/flush-caches`
- **Returns:** `void`
- **Headers:** Authorization: Bearer {token}

## User Experience

### Dashboard Cache Grid

1. Shows all caches across all services
2. Displays cache name, service, item count, and status
3. Each cache has a "Clear" button
4. Button shows "Clearing..." while operation is in progress
5. Confirmation modal before clearing
6. Success/error notifications
7. Auto-refresh after clearing

### Service Details Page

1. Shows list of cache names for the specific service
2. "Flush All Caches" button at the top
3. Button shows "Flushing..." while operation is in progress
4. Confirmation modal shows cache count
5. Success/error notifications
6. Auto-refresh after flushing

## Confirmation Modals

### Clear Cache

- **Title:** "Clear Cache"
- **Message:** "Are you sure you want to clear the cache "{cacheName}"? This action cannot be undone."
- **Type:** Warning
- **Buttons:** "Clear Cache" / "Cancel"

### Flush All Caches

- **Title:** "Flush All Caches"
- **Message:** "Are you sure you want to flush all {count} cache(s) for {serviceName}? This action cannot be undone."
- **Type:** Warning
- **Buttons:** "Flush All" / "Cancel"

## Notifications

### Success

- **Clear Cache:** "Cache Cleared" - "Cache "{cacheName}" has been cleared"
- **Flush Caches:** "Caches Flushed" - "All caches for service have been flushed"

### Error

- **Clear Cache:** "Failed to clear cache" - {error message}
- **Flush Caches:** "Failed to flush caches" - {error message}

## Testing Checklist

### Dashboard

- [ ] Navigate to dashboard
- [ ] Verify "All Caches" section displays
- [ ] Verify cache table shows correct data
- [ ] Click "Clear" button on a cache
- [ ] Verify confirmation modal appears
- [ ] Confirm clearing
- [ ] Verify success notification
- [ ] Verify cache is removed/refreshed

### Service Details

- [ ] Navigate to a service detail page
- [ ] Verify "Caches for this service" section displays
- [ ] Verify cache names are listed
- [ ] Click "Flush All Caches" button
- [ ] Verify confirmation modal with cache count
- [ ] Confirm flushing
- [ ] Verify success notification
- [ ] Verify button shows loading state

### Error Handling

- [ ] Test with API offline
- [ ] Test with invalid cache name
- [ ] Test with invalid service ID
- [ ] Verify error notifications display
- [ ] Verify loading states reset on error

## Notes

- All cache operations require JWT authentication
- Cache names returned from API are simple strings (not full Cache objects)
- Service detail page simplified to show only cache names
- Dashboard shows full Cache objects with metadata
- All destructive operations require confirmation
- Loading states prevent duplicate requests
- Auto-refresh after successful operations ensures data consistency

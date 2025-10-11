# Cache Detail Modal Feature

## Overview
Added a "Details" button next to each cache's "Remove" button that opens a modal displaying the full cache content fetched from the API.

## Implementation

### TypeScript Changes (`service-detail.ts`)

#### 1. Added Modal Import
```typescript
import { Modal } from '../../../shared/components/modal/modal';

@Component({
  selector: 'app-service-detail',
  imports: [CommonModule, Pagination, Modal],
  // ...
})
```

#### 2. New Signals for Cache Detail Modal
```typescript
// Cache detail modal
cacheDetailModalOpen = signal(false);
cacheDetailData = signal<any>(null);
cacheDetailLoading = signal(false);
currentCacheKey = signal<string>('');
```

**Signal Purposes:**
- `cacheDetailModalOpen`: Controls modal visibility
- `cacheDetailData`: Stores the fetched cache data
- `cacheDetailLoading`: Shows loading spinner while fetching
- `currentCacheKey`: Stores the current cache key being viewed

#### 3. New Methods

##### Open Cache Detail Modal
```typescript
openCacheDetail(cacheKey: string) {
  const service = this.service();
  if (!service) return;

  this.currentCacheKey.set(cacheKey);
  this.cacheDetailModalOpen.set(true);
  this.cacheDetailLoading.set(true);
  this.cacheDetailData.set(null);

  this.dataService.getCacheByKey(service.id!, cacheKey).subscribe({
    next: (data) => {
      this.cacheDetailData.set(data);
      this.cacheDetailLoading.set(false);
    },
    error: (error) => {
      console.error('Failed to load cache details:', error);
      this.cacheDetailLoading.set(false);
    }
  });
}
```

**Flow:**
1. Sets the cache key for display in modal title
2. Opens the modal
3. Shows loading state
4. Calls API via `getCacheByKey(serviceId, key)`
5. Displays data or handles error

##### Close Modal
```typescript
closeCacheDetailModal() {
  this.cacheDetailModalOpen.set(false);
  this.cacheDetailData.set(null);
  this.currentCacheKey.set('');
}
```

##### Copy JSON to Clipboard
```typescript
copyCacheDetailJSON() {
  const json = JSON.stringify(this.cacheDetailData(), null, 2);
  navigator.clipboard.writeText(json).then(() => {
    console.log('Cache detail JSON copied to clipboard');
  });
}
```

### HTML Changes (`service-detail.html`)

#### 1. Added Details Button in Cache Keys Table
```html
<td class="col-actions">
  <div class="table-actions">
    <!-- Details Button (NEW) -->
    <button
      class="btn primary sm btn-ripple"
      (click)="openCacheDetail(cacheName)"
    >
      <svg><!-- Eye icon --></svg>
      Details
    </button>
    
    <!-- Existing Remove Button -->
    <button
      class="btn danger sm btn-ripple"
      (click)="removeCacheByKey(cacheName)"
      [disabled]="removingCache() === cacheName"
    >
      <svg><!-- Trash icon --></svg>
      {{ removingCache() === cacheName ? 'Removing...' : 'Remove' }}
    </button>
  </div>
</td>
```

**Features:**
- Primary blue button with eye icon
- Sits beside the existing Remove button
- Uses `.table-actions` class for proper spacing

#### 2. Cache Detail Modal
```html
<app-modal 
  [isOpen]="cacheDetailModalOpen()" 
  [title]="'Cache Details: ' + currentCacheKey()"
  (closeModal)="closeCacheDetailModal()"
>
  <div style="padding: 16px;">
    @if (cacheDetailLoading()) {
      <!-- Loading Spinner -->
      <div style="text-align: center; padding: 32px;">
        <div class="spinner"></div>
        <div>Loading cache details...</div>
      </div>
    } @else if (cacheDetailData()) {
      <!-- Cache Content Display -->
      <div>
        <div style="display: flex; justify-content: space-between;">
          <h3>Cache Content</h3>
          <button (click)="copyCacheDetailJSON()">Copy JSON</button>
        </div>
        <pre>{{ cacheDetailData() | json }}</pre>
      </div>
    } @else {
      <!-- No Data State -->
      <div>No cache data available</div>
    }
  </div>
</app-modal>
```

**Modal States:**
1. **Loading**: Shows spinner while fetching data
2. **Data Loaded**: Displays JSON with copy button
3. **No Data**: Shows message if no data available

## API Integration

### DataService Method Used
```typescript
getCacheByKey(serviceId: string, key: string): Observable<any>
```

**Endpoint:** `GET /api/caches?serviceId={id}&key={key}`

**Returns:** The full cache data for the specified service and key

## UI/UX Features

### Button Layout
```
┌─────────────────────────────────────────────────┐
│ Cache Name          │ [Details] [Remove]        │
└─────────────────────────────────────────────────┘
```

### Modal Layout
```
┌─────────────────────────────────────────────────┐
│ Cache Details: cache-key-123            [Close] │
├─────────────────────────────────────────────────┤
│                                                  │
│ Cache Content                     [Copy JSON]   │
│ ┌──────────────────────────────────────────┐   │
│ │ {                                        │   │
│ │   "key": "value",                        │   │
│ │   "data": {...},                         │   │
│ │   "timestamp": "2025-10-04T..."          │   │
│ │ }                                        │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Styling

### Details Button
- **Color**: Primary (blue)
- **Icon**: Eye icon (view/inspect)
- **Size**: Small (`sm`)
- **Effect**: Ripple animation

### Modal Content
- **Max Height**: 500px with scroll
- **Background**: `rgba(255, 255, 255, 0.04)`
- **Border**: `1px solid var(--glass-border)`
- **Padding**: 16px
- **Border Radius**: 8px
- **Font**: Monospace for JSON display

### Loading State
- **Spinner**: 40px diameter
- **Animation**: Spin 0.8s linear infinite
- **Message**: "Loading cache details..."

## User Flow

1. User views Agent Response with cache keys
2. User clicks "Details" button next to a cache
3. Modal opens showing loading spinner
4. API fetches cache data
5. JSON is displayed in formatted view
6. User can:
   - Scroll through the JSON content
   - Copy JSON to clipboard
   - Close modal via backdrop or close button

## Error Handling

- API errors are logged to console
- Loading state is cleared on error
- Modal remains open showing "No cache data available"
- User can close and retry

## Benefits

1. **Quick Inspection**: View cache content without leaving the page
2. **No Navigation**: Modal overlay keeps context
3. **Copy Feature**: Easy to copy cache data for debugging
4. **Loading Feedback**: Clear visual feedback during API call
5. **Responsive**: Scrollable content for large JSON objects
6. **Consistent UX**: Uses existing modal component

## Testing Checklist

- [ ] Click Details button opens modal
- [ ] Loading spinner shows while fetching
- [ ] Cache data displays correctly as JSON
- [ ] Copy JSON button works
- [ ] Modal closes on backdrop click
- [ ] Modal closes on Close button click
- [ ] Modal closes on ESC key (if supported by Modal component)
- [ ] Error handling works (test with invalid cache key)
- [ ] Multiple caches can be viewed sequentially
- [ ] Scroll works for large JSON objects
- [ ] JSON formatting is readable

## Future Enhancements

- [ ] Add syntax highlighting for JSON
- [ ] Add search/filter within JSON
- [ ] Add expand/collapse for JSON tree view
- [ ] Add download option for cache data
- [ ] Add cache metadata (size, TTL, last access)
- [ ] Add refresh button to reload cache data
- [ ] Add comparison view for multiple caches
- [ ] Add cache history/versions view

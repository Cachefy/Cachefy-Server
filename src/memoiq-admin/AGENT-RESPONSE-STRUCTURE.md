# Agent Response Structure - Service Details Cache Display

## Overview
Updated the service details page to display cache information using the new `AgentResponse` structure from the API. Instead of showing a simple list of cache keys, the page now displays comprehensive agent response data including parameters, cache keys, and cache results in organized grids.

## New Data Structure

### TypeScript Models

#### AgentResponse Model
```typescript
export interface ParametersDetails {
  name: string;
  parameters: { [key: string]: string };
}

export interface AgentResponse {
  parametersDetails: ParametersDetails[];
  cacheKeys: string[];
  cacheResult: any;
}
```

### Backend C# Structure
```csharp
public class AgentResponse
{
    public List<ParametersDetails> ParametersDetails { get; set; } = null!;
    public List<string> CacheKeys { get; set; } = null!;
    public object CacheResult { get; set; } = null!;
}

public class ParametersDetails
{
    public string Name { get; set; } = null!;
    public Dictionary<string, string> Parameters { get; set; } = null!;
}
```

## Changes Made

### 1. Created New Model File

**File:** `src/app/core/models/agent-response.model.ts`

Created TypeScript interfaces to match the C# backend structure:
- `ParametersDetails`: Contains parameter name and key-value pairs
- `AgentResponse`: Contains parameter details, cache keys, and cache result

### 2. Updated DataService

**File:** `src/app/core/services/data.ts`

#### Added Import
```typescript
import { AgentResponse } from '../models/agent-response.model';
```

#### Added New Method: `getAgentResponsesForService()`

```typescript
getAgentResponsesForService(serviceId: string): Observable<AgentResponse[]> {
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
}
```

**Purpose:**
- Fetches full agent response data (not just cache keys)
- Returns array of `AgentResponse` objects
- Endpoint: `GET /api/caches?serviceId={serviceId}`

**Note:** The existing `getCachesForService()` method is preserved for backward compatibility and uses a different endpoint (`/caches/keys?serviceId={serviceId}`).

### 3. Updated Service Detail Component

**File:** `src/app/features/services/service-detail/service-detail.ts`

#### Updated Imports
```typescript
import { AgentResponse } from '../../../core/models/agent-response.model';
```

#### Changed State Management
```typescript
// Before
caches = signal<string[]>([]);
paginatedCaches = computed(() => { ... });

// After
agentResponses = signal<AgentResponse[]>([]);
paginatedAgentResponses = computed(() => { ... });
```

#### Updated Computed Properties

**serviceSnapshot:**
```typescript
serviceSnapshot = computed(() => {
  const svc = this.service();
  const responses = this.agentResponses();
  if (!svc) return {};

  return {
    serviceId: svc.id,
    service: svc,
    agentResponses: responses,
    totalAgents: responses.length,
    generatedAt: new Date().toISOString(),
  };
});
```

**paginatedAgentResponses:**
```typescript
paginatedAgentResponses = computed(() => {
  const start = (this.currentPage() - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.agentResponses().slice(start, end);
});
```

#### Updated Methods

**loadServiceData:**
```typescript
private loadServiceData(serviceId: string) {
  this.dataService.getServices().subscribe((services) => {
    const foundService = services.find(/* ... */);

    if (foundService) {
      this.service.set(foundService);

      // Load agent responses instead of just cache keys
      this.dataService.getAgentResponsesForService(serviceId).subscribe((responses) => {
        this.agentResponses.set(responses);
      });
    }
  });
}
```

**flushAllCaches:**
```typescript
async flushAllCaches() {
  const service = this.service();
  if (!service) return;

  // Count total cache keys across all agent responses
  const totalCaches = this.agentResponses().reduce(
    (sum, response) => sum + (response.cacheKeys?.length || 0),
    0
  );

  const confirmed = await this.confirmationService.confirm({
    title: 'Flush All Caches',
    message: `Are you sure you want to flush all ${totalCaches} cache(s) for ${service.name}?`,
    // ...
  });

  // Rest of implementation
}
```

**Added loadAgentResponsesForService:**
```typescript
private loadAgentResponsesForService(serviceId: string) {
  this.dataService.getAgentResponsesForService(serviceId).subscribe((responses) => {
    this.agentResponses.set(responses);
  });
}
```

### 4. Updated Service Detail Template

**File:** `src/app/features/services/service-detail/service-detail.html`

#### Complete Redesign of Cache Section

The template now shows:

1. **Header Section**
   - Title: "Agent Responses for this service"
   - "Flush All Caches" button (if responses exist)

2. **Agent Response Cards** (for each response in the array)
   Each card contains three sections:

   **a) Parameters Details Section**
   - Displays each parameter set by name
   - Shows key-value pairs in a table
   - Columns: Parameter, Value
   
   ```html
   @if (agentResponse.parametersDetails && agentResponse.parametersDetails.length > 0) {
     <div>
       <h3>Parameters</h3>
       @for (param of agentResponse.parametersDetails; track param.name) {
         <div>{{ param.name }}</div>
         <table>
           @for (paramEntry of param.parameters | keyvalue; track paramEntry.key) {
             <tr>
               <td>{{ paramEntry.key }}</td>
               <td>{{ paramEntry.value }}</td>
             </tr>
           }
         </table>
       }
     </div>
   }
   ```

   **b) Cache Keys Section**
   - Shows all cache keys for the agent
   - Each cache has a "Remove" button
   - Count badge showing number of caches
   - Columns: Cache Name, Actions
   
   ```html
   @if (agentResponse.cacheKeys && agentResponse.cacheKeys.length > 0) {
     <div>
       <h3>Cache Keys ({{ agentResponse.cacheKeys.length }})</h3>
       <table>
         @for (cacheName of agentResponse.cacheKeys; track cacheName) {
           <tr>
             <td>{{ cacheName }}</td>
             <td>
               <button (click)="removeCacheByKey(cacheName)">
                 Remove
               </button>
             </td>
           </tr>
         }
       </table>
     </div>
   }
   ```

   **c) Cache Result Section**
   - Displays the cache result object as formatted JSON
   - Scrollable with max-height
   
   ```html
   @if (agentResponse.cacheResult) {
     <div>
       <h3>Cache Result</h3>
       <pre>{{ agentResponse.cacheResult | json }}</pre>
     </div>
   }
   ```

3. **Pagination**
   - Applied to agent responses (not individual caches)
   - Each page shows a configurable number of agent response cards

4. **Empty State**
   - Shows when no agent responses are available

## UI Design

### Card Styling
- Each agent response is in a separate card
- Cards have subtle background and border
- Sections within cards are clearly separated
- Responsive design with proper spacing

### Color Scheme
- Headers: App text color
- Parameter names: Slate-600 (#94a3b8)
- Parameter values: Slate-400
- Borders: Slate-700
- Hover states: Slate-800/30

### Tables
- Clean, minimalist design
- Hover effects on rows
- Clear column headers
- Proper padding and spacing

## API Integration

### Endpoint
```
GET /api/caches?serviceId={serviceId}
```

### Response Format
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
  },
  {
    "parametersDetails": [
      {
        "name": "Agent2",
        "parameters": {
          "apiKey": "xyz789",
          "region": "eu-west-1",
          "environment": "staging"
        }
      }
    ],
    "cacheKeys": [
      "ProductCatalog",
      "PricingData"
    ],
    "cacheResult": {
      "status": "active",
      "lastUpdated": "2025-10-04T10:25:00Z",
      "itemCount": 75
    }
  }
]
```

## Features

### 1. Multiple Agent Support
- Displays cache data from multiple agents
- Each agent has its own card with parameters and caches
- Paginated view for many agents

### 2. Parameter Visibility
- Shows configuration parameters for each agent
- Key-value display in table format
- Easy to see which agent is configured with what parameters

### 3. Cache Management
- View all cache keys per agent
- Remove individual caches with confirmation
- Flush all caches across all agents
- Loading states during operations

### 4. Cache Result Preview
- View the cache result object
- JSON formatted for readability
- Scrollable for large results

### 5. Pagination
- Navigate through multiple agent responses
- Configurable items per page (default: 10)
- Preserves state when navigating

## Benefits

### 1. Better Organization
- Grouped by agent response
- Clear separation of parameters, keys, and results
- Hierarchical display of related data

### 2. More Information
- Shows not just cache keys but also parameters and results
- Provides context about each cache source
- Better debugging capabilities

### 3. Scalability
- Handles multiple agents gracefully
- Pagination prevents overwhelming UI
- Expandable structure for future additions

### 4. Better UX
- Clear visual hierarchy
- Intuitive grouping
- Easy to scan and understand

## Migration Notes

### Breaking Changes
- Backend must return `AgentResponse[]` structure
- Old simple string array format no longer supported
- Component state changed from `caches` to `agentResponses`

### Backward Compatibility
- `getCachesForService()` method preserved (uses different endpoint)
- Can be used for simple cache key listing
- New `getAgentResponsesForService()` for full data

### Deployment Requirements
1. Update backend to return `AgentResponse` structure
2. Ensure endpoint `/api/caches?serviceId={id}` returns array
3. Deploy frontend with new component
4. Test with multiple agents

## Testing Checklist

### Display Tests
- [ ] Agent responses load correctly
- [ ] Multiple agents display in separate cards
- [ ] Parameters table shows all key-value pairs
- [ ] Cache keys list displays correctly
- [ ] Cache result JSON is formatted properly
- [ ] Empty states show when no data

### Functionality Tests
- [ ] Pagination works correctly
- [ ] Remove cache button works for individual caches
- [ ] Flush all caches counts total across all agents
- [ ] Confirmation modals appear before destructive actions
- [ ] Loading states display during operations
- [ ] Data refreshes after cache operations

### Edge Cases
- [ ] No agent responses (empty state)
- [ ] Agent with no parameters
- [ ] Agent with no cache keys
- [ ] Agent with no cache result
- [ ] Very long parameter names/values
- [ ] Large cache result objects
- [ ] Special characters in parameter names/values
- [ ] Many agents (pagination)

### UI Tests
- [ ] Cards are properly styled
- [ ] Tables are responsive
- [ ] Hover effects work
- [ ] Buttons are properly aligned
- [ ] Text colors are readable
- [ ] Spacing is consistent

## Example Use Cases

### 1. Multi-Region Cache Monitoring
```
Agent: US-East Agent
Parameters: region=us-east-1, env=prod
Caches: [SessionHistory, UserData]
Result: { itemCount: 1500, lastSync: "..." }

Agent: EU-West Agent
Parameters: region=eu-west-1, env=prod
Caches: [SessionHistory, UserData]
Result: { itemCount: 800, lastSync: "..." }
```

### 2. Environment-Specific Caches
```
Agent: Production Agent
Parameters: env=production, version=2.0
Caches: [ProductCatalog, Pricing, Inventory]

Agent: Staging Agent
Parameters: env=staging, version=2.1-rc1
Caches: [ProductCatalog, Pricing]
```

### 3. Service Instance Caches
```
Agent: Instance-1
Parameters: instanceId=i-abc123, pod=pod-1
Caches: [LocalCache, SharedCache]

Agent: Instance-2
Parameters: instanceId=i-def456, pod=pod-2
Caches: [LocalCache, SharedCache]
```

## Future Enhancements

### 1. Collapsible Sections
- Expand/collapse parameter tables
- Expand/collapse cache keys lists
- Expand/collapse cache results

### 2. Filtering and Search
- Filter by agent name
- Search within parameters
- Filter by cache key patterns

### 3. Cache Analytics
- Show cache hit/miss ratios per agent
- Display cache sizes
- Show last access times

### 4. Bulk Operations
- Select multiple caches to remove
- Clear caches by pattern
- Export cache data

### 5. Real-Time Updates
- WebSocket integration for live cache updates
- Auto-refresh option
- Change notifications

## Related Documentation

- See `CACHE-API-PARAMETER-RENAME.md` for cache API parameter changes
- See `CACHE-API-QUERY-PARAMS-UPDATE.md` for query parameter migration
- See `CACHE-MANAGEMENT-FEATURES.md` for overall cache features
- See `REMOVE-CACHE-BY-KEY-FEATURE.md` for cache removal functionality

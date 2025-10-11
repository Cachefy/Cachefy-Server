# Agent Type Feature - Docker & Service Fabric

## Overview

This feature adds the ability to specify and display the type of agent being used in the Volatix Admin system. Agents can be categorized as either **Docker** containers or **Service Fabric** services, with appropriate icons displayed throughout the UI.

## Feature Summary

### Agent Types Supported:

1. **Docker** 🐳 - For containerized agents
2. **Service Fabric** ⚙️ - For Service Fabric-based agents

### Key Changes:

- Added `type` field to Agent model
- Added Agent Type dropdown in Settings
- Dynamic icon display based on agent type
- Icons shown in: Agent cards, Services list, Service detail, Settings table

---

## Implementation Details

### 1. Agent Model Update

**File**: `src/app/core/models/agent.model.ts`

**Added Field**:

```typescript
export interface Agent {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  apiKeyGenerated?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'online' | 'offline';
  isLoading?: boolean;
  type?: 'docker' | 'servicefabric'; // ✅ NEW: Agent type
}
```

**Properties**:

- `type`: Optional field with union type `'docker' | 'servicefabric'`
- Default: `'docker'` if not specified
- Stored in backend and persisted across sessions

---

### 2. Settings Component Updates

**File**: `src/app/features/settings/settings.ts`

#### Updated Agent Form:

```typescript
agentForm = {
  name: '',
  url: '',
  type: 'docker' as 'docker' | 'servicefabric', // Default to docker
};
```

#### New Helper Methods:

```typescript
getAgentIcon(type?: 'docker' | 'servicefabric'): string {
  return type === 'servicefabric' ? '⚙️' : '🐳';
}

getAgentTypeLabel(type?: 'docker' | 'servicefabric'): string {
  return type === 'servicefabric' ? 'Service Fabric' : 'Docker';
}
```

#### Updated Methods:

- `editAgent()`: Now includes `type` field when editing
- `clearForm()`: Resets `type` to default `'docker'`
- `saveAgent()`: Saves agent with selected type

---

### 3. Settings UI Updates

**File**: `src/app/features/settings/agent-settings.html`

#### New Agent Type Dropdown:

```html
<div class="row">
  <div class="form-group" style="flex: 1">
    <label for="agentType">Agent Type</label>
    <select id="agentType" [(ngModel)]="agentForm.type" class="form-input">
      <option value="docker">🐳 Docker</option>
      <option value="servicefabric">⚙️ Service Fabric</option>
    </select>
  </div>
</div>
```

#### Updated Agents Table:

- Added **Type** column after Name column
- Displays icon with tooltip showing full type name

```html
<thead>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <!-- ✅ NEW COLUMN -->
    <th>URL</th>
    <th>ApiKey</th>
    <th>Updated</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>{{ agent.name }}</td>
    <td style="font-size: 18px;">
      <span title="{{ getAgentTypeLabel(agent.type) }}"> {{ getAgentIcon(agent.type) }} </span>
    </td>
    <!-- ... other columns -->
  </tr>
</tbody>
```

---

### 4. Services List Component Updates

**File**: `src/app/features/services/services-list/services-list.ts`

#### New Helper Method:

```typescript
getAgentIcon(agentId: string): string {
  const agent = this.agents().find(a => a.id === agentId);
  return agent?.type === 'servicefabric' ? '⚙️' : '🐳';
}
```

**File**: `src/app/features/services/services-list/services-list.html`

#### Updated Agent Cards:

```html
<div class="agent-icon">
  <!-- Dynamic icon based on agent type -->
  <span class="icon">{{ agentData.agent.type === 'servicefabric' ? '⚙️' : '🐳' }}</span>
  <div class="status-indicator"></div>
</div>
```

#### Updated Services Table:

```html
<td class="p-2">
  <div class="agent-info-cell">
    <!-- Dynamic icon in table -->
    <span class="agent-icon-small">{{ getAgentIcon(service.agentId || '') }}</span>
    <span>{{ getAgentName(service.agentId || '') }}</span>
  </div>
</td>
```

---

### 5. Service Detail Component Updates

**File**: `src/app/features/services/service-detail/service-detail.ts`

#### New Helper Method:

```typescript
getAgentIcon(): string {
  const agent = this.serviceAgent();
  return agent?.type === 'servicefabric' ? '⚙️' : '🐳';
}
```

**File**: `src/app/features/services/service-detail/service-detail.html`

#### Updated Agent Status Card:

```html
<div class="agent-icon-large">
  <!-- Dynamic icon in agent status card -->
  <span class="icon">{{ getAgentIcon() }}</span>
  <div class="status-indicator"></div>
</div>
```

---

## User Interface

### 1. Settings Page - Agent Form

```
┌─────────────────────────────────────────┐
│ Agent Configuration                     │
├─────────────────────────────────────────┤
│                                         │
│ Agent Name                              │
│ ┌─────────────────────────────────────┐ │
│ │ my-cache-agent                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Agent URL                               │
│ ┌─────────────────────────────────────┐ │
│ │ https://agent.example.com           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Agent Type                              │
│ ┌─────────────────────────────────────┐ │
│ │ 🐳 Docker                  ▼        │ │  ← NEW DROPDOWN
│ └─────────────────────────────────────┘ │
│   Options:                              │
│   - 🐳 Docker                           │
│   - ⚙️ Service Fabric                   │
│                                         │
│ [➕ Add Agent]  [Clear]                 │
└─────────────────────────────────────────┘
```

### 2. Settings Page - Agents Table

```
┌───────────────────────────────────────────────────────────────┐
│ Agents                           [Import] [Export]            │
├──────────────┬──────┬────────────────┬─────────┬─────────────┤
│ Name         │ Type │ URL            │ ApiKey  │ Actions     │
├──────────────┼──────┼────────────────┼─────────┼─────────────┤
│ cache-agent1 │ 🐳   │ https://...    │ ****123 │ [Edit] [...] │
│ sf-agent2    │ ⚙️   │ https://...    │ ****456 │ [Edit] [...] │
│ docker-prod  │ 🐳   │ https://...    │ ****789 │ [Edit] [...] │
└──────────────┴──────┴────────────────┴─────────┴─────────────┘
           NEW COLUMN ↑
```

### 3. Services List - Agent Cards

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  🐳  ⦿ (green)              │  │  ⚙️  ⦿ (green)              │
│      Docker Agent           │  │      Service Fabric Agent   │
│  cache-agent1               │  │  sf-production              │
│  5 services                 │  │  12 services                │
│  [✓ ONLINE]                 │  │  [✓ ONLINE]                 │
└─────────────────────────────┘  └─────────────────────────────┘
   Docker icon                      Service Fabric icon
```

### 4. Services List - Services Table

```
┌────────────────────────────────────────────────────────────────┐
│ Registered Services                                            │
├───────────┬──────────────────┬──────────┬────────────────────┤
│ Service   │ Agent            │ Status   │ Actions            │
├───────────┼──────────────────┼──────────┼────────────────────┤
│ CacheAPI  │ 🐳 cache-agent1  │ ✓ Online │ [Details] [Ping]   │
│ AuthAPI   │ ⚙️ sf-production │ ✓ Online │ [Details] [Ping]   │
│ DataAPI   │ 🐳 docker-prod   │ ✗ Down   │ [Details] [Ping]   │
└───────────┴──────────────────┴──────────┴────────────────────┘
              ↑ Dynamic icons based on agent type
```

### 5. Service Detail - Agent Status Card

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Status                               [🔄 Refresh]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ⚙️  ⦿ (green)         sf-production                    │
│                           Status: ✓ ONLINE                  │
│                           URL: https://sf.example.com       │
│                           Message: OK                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
       ↑ Service Fabric icon (changes based on agent type)
```

---

## Icon Mapping

### Visual Reference:

| Agent Type     | Value             | Icon | Unicode | Display             |
| -------------- | ----------------- | ---- | ------- | ------------------- |
| Docker         | `'docker'`        | 🐳   | U+1F433 | Whale emoji         |
| Service Fabric | `'servicefabric'` | ⚙️   | U+2699  | Gear/Settings emoji |

### Usage:

```typescript
// In TypeScript
agent.type === 'docker' ? '🐳' : '⚙️';
agent.type === 'servicefabric' ? '⚙️' : '🐳';

// In HTML Template
{
  {
    agentData.agent.type === 'servicefabric' ? '⚙️' : '🐳';
  }
}
{
  {
    getAgentIcon(agent.type);
  }
}
```

---

## Data Flow

### Creating/Updating Agent:

```
User Action
  │
  ├─ Select Agent Type from Dropdown
  │   - Options: Docker / Service Fabric
  │   - Default: Docker
  │
  ├─ Fill in Name & URL
  │
  ├─ Click "Add Agent" or "Update Agent"
  │
  ▼
Settings Component
  │
  ├─ agentForm.type = 'docker' or 'servicefabric'
  │
  ├─ Call dataService.saveAgent(agentData)
  │
  ▼
DataService
  │
  ├─ POST /api/agents (new) or PUT /api/agents/{id} (update)
  │
  ├─ Send: { name, url, type }
  │
  ▼
Backend API
  │
  ├─ Store agent with type field
  │
  ├─ Return: Agent { id, name, url, apiKey, type, ... }
  │
  ▼
Frontend
  │
  ├─ Update agents signal
  │
  ├─ Render icon based on agent.type
  │
  └─ Display: 🐳 or ⚙️
```

### Displaying Agent Icon:

```
Component Needs Icon
  │
  ├─ Has agent object?
  │   │
  │   ├─ Yes: Check agent.type
  │   │   │
  │   │   ├─ type === 'servicefabric' → Display ⚙️
  │   │   │
  │   │   └─ type === 'docker' or undefined → Display 🐳
  │   │
  │   └─ No: Default to 🐳
  │
  └─ Render icon in UI
```

---

## Backend Requirements

### API Endpoints to Update:

#### 1. POST /api/agents (Create Agent)

```json
Request Body:
{
  "name": "cache-agent-1",
  "url": "https://agent.example.com",
  "type": "docker"  // ✅ NEW FIELD
}

Response:
{
  "id": "agent-123",
  "name": "cache-agent-1",
  "url": "https://agent.example.com",
  "apiKey": "generated-key",
  "type": "docker",  // ✅ NEW FIELD
  "createdAt": "2025-10-10T...",
  "updatedAt": "2025-10-10T..."
}
```

#### 2. PUT /api/agents/{id} (Update Agent)

```json
Request Body:
{
  "name": "cache-agent-1",
  "url": "https://agent.example.com",
  "type": "servicefabric"  // ✅ NEW FIELD
}

Response:
{
  "id": "agent-123",
  "name": "cache-agent-1",
  "url": "https://agent.example.com",
  "apiKey": "existing-key",
  "type": "servicefabric",  // ✅ UPDATED FIELD
  "createdAt": "2025-10-10T...",
  "updatedAt": "2025-10-10T..."
}
```

#### 3. GET /api/agents (List Agents)

```json
Response:
[
  {
    "id": "agent-123",
    "name": "cache-agent-1",
    "url": "https://agent.example.com",
    "apiKey": "key-123",
    "type": "docker",  // ✅ INCLUDE IN RESPONSE
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "id": "agent-456",
    "name": "sf-agent-prod",
    "url": "https://sf.example.com",
    "apiKey": "key-456",
    "type": "servicefabric",  // ✅ INCLUDE IN RESPONSE
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### Backend Model Update (C#):

```csharp
public class Agent
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Url { get; set; }
    public string ApiKey { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ✅ NEW PROPERTY
    public AgentType Type { get; set; } = AgentType.Docker; // Default to Docker
}

public enum AgentType
{
    Docker,
    ServiceFabric
}

// Or use string if preferred:
public class Agent
{
    // ...
    public string Type { get; set; } = "docker"; // "docker" or "servicefabric"
}
```

---

## Migration & Backward Compatibility

### Existing Agents (No Type Specified):

- Frontend defaults to `'docker'` if `type` is `undefined`
- All existing agents will display Docker icon (🐳) by default
- Users can update existing agents to set correct type

### Database Migration:

```sql
-- Add Type column with default value
ALTER TABLE Agents
ADD Type VARCHAR(20) DEFAULT 'docker';

-- Or for enum-based approach:
ALTER TABLE Agents
ADD Type INT DEFAULT 0; -- 0 = Docker, 1 = ServiceFabric
```

### Frontend Handling:

```typescript
// All icon helper methods include fallback:
getAgentIcon(type?: 'docker' | 'servicefabric'): string {
  return type === 'servicefabric' ? '⚙️' : '🐳'; // Defaults to Docker
}

// In templates:
{{ agentData.agent.type === 'servicefabric' ? '⚙️' : '🐳' }}
// If type is undefined, shows '🐳' (Docker)
```

---

## Testing Checklist

### Settings Page:

- [ ] Create new agent with Docker type
- [ ] Verify Docker icon (🐳) shows in agents table
- [ ] Create new agent with Service Fabric type
- [ ] Verify Service Fabric icon (⚙️) shows in agents table
- [ ] Edit existing agent and change type
- [ ] Verify icon updates in table
- [ ] Hover over icon and verify tooltip shows full type name
- [ ] Clear form and verify type resets to Docker

### Services List Page:

- [ ] Navigate to services list
- [ ] Verify agent cards show correct icons (🐳 or ⚙️)
- [ ] Verify services table shows correct agent icons
- [ ] Select different agents and verify icons match
- [ ] Verify "All Services" card doesn't break

### Service Detail Page:

- [ ] Open service with Docker agent
- [ ] Verify agent status card shows Docker icon (🐳)
- [ ] Open service with Service Fabric agent
- [ ] Verify agent status card shows Service Fabric icon (⚙️)
- [ ] Click refresh and verify icon persists

### Import/Export:

- [ ] Export agents as JSON
- [ ] Verify exported JSON includes `type` field
- [ ] Import agents JSON with type field
- [ ] Verify agents import with correct types
- [ ] Verify icons display correctly after import

### Edge Cases:

- [ ] Load agents with missing/null type field → Should default to Docker
- [ ] Load agents with invalid type value → Should default to Docker
- [ ] Backend returns type in different case → Handle gracefully
- [ ] Agent created before feature → Should show Docker icon

---

## Future Enhancements

### 1. Additional Agent Types:

```typescript
type AgentType =
  | 'docker'
  | 'servicefabric'
  | 'kubernetes' // ☸️
  | 'ecs' // 🚀
  | 'lambda' // λ
  | 'vm'; // 💻
```

### 2. Custom Icons:

- Allow users to upload custom icons per agent
- Support SVG icons for better quality
- Icon picker UI component

### 3. Agent Type Filtering:

```typescript
filterByType = signal<AgentType | 'all'>('all');

filteredAgents = computed(() => {
  const filter = this.filterByType();
  if (filter === 'all') return this.agents();
  return this.agents().filter((a) => a.type === filter);
});
```

UI:

```
Filter: [All] [🐳 Docker] [⚙️ Service Fabric]
```

### 4. Agent Type Statistics:

```typescript
agentTypeStats = computed(() => ({
  docker: this.agents().filter((a) => a.type === 'docker').length,
  servicefabric: this.agents().filter((a) => a.type === 'servicefabric').length,
}));
```

Display:

```
📊 Agent Types:
   🐳 Docker: 15 agents
   ⚙️ Service Fabric: 8 agents
```

### 5. Type-Specific Configuration:

- Different health check intervals per type
- Type-specific environment variables
- Custom ping endpoints per type

---

## Troubleshooting

### Issue: Icon not displaying correctly

**Solution**: Check browser font support for emojis. Consider using SVG icons as fallback.

### Issue: Type not saving to backend

**Solution**: Verify backend API accepts `type` field. Check network tab for request payload.

### Issue: Existing agents show wrong icon

**Solution**: Update agents through Settings page to set correct type. Or run data migration script.

### Issue: Icon looks different across browsers

**Solution**: Emoji rendering varies by OS/browser. Consider using consistent icon library (e.g., SVG sprites).

---

## Related Files

### Modified Files:

- `src/app/core/models/agent.model.ts` - Added `type` field
- `src/app/features/settings/settings.ts` - Added type handling & helper methods
- `src/app/features/settings/agent-settings.html` - Added dropdown & type column
- `src/app/features/services/services-list/services-list.ts` - Added `getAgentIcon()` method
- `src/app/features/services/services-list/services-list.html` - Dynamic icon display
- `src/app/features/services/service-detail/service-detail.ts` - Added `getAgentIcon()` method
- `src/app/features/services/service-detail/service-detail.html` - Dynamic icon display

### Related Documentation:

- `AGENT-LOADING-STATE.md` - Agent loading states
- `AGENT-STATUS-UPDATE.md` - Agent status updates
- `AGENT-STATUS-INTEGRATION.md` - Agent ping API integration

---

_Implementation Date: October 10, 2025_
_Feature: Agent Type Selection (Docker / Service Fabric)_
_Status: Complete_

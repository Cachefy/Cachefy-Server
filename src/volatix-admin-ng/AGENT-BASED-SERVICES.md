# Agent-Based Services Feature

## Overview

The services list has been restructured to organize services by their registered agents. This provides a clear view of which agents are managing which services, with filtering capabilities.

## Features

### 🐳 Agent Selection Panel

- **Visual Agent Cards**: Each agent is displayed with a container icon (🐳), status indicator, and service count
- **All Services View**: Default view showing all services from all agents
- **Agent Filtering**: Click on any agent card to filter services by that agent
- **Status Indicators**: Online/offline status badges with visual indicators

### 📊 Service Organization

- **Agent Column**: Services table includes an agent column showing which agent registered the service
- **Filtered View**: When an agent is selected, only their services are displayed
- **Quick Stats**: Sidebar shows total services, total agents, and active agents count

### 🎨 User Experience

- **Responsive Grid**: Agent cards adapt to screen size
- **Visual Feedback**: Selected agent cards are highlighted
- **Clear Filter Badge**: Shows currently selected agent with a quick clear button
- **Empty States**: Helpful messages when no services are found for an agent

## Data Models

### Service Model (Updated)

```typescript
export interface Service {
  id?: string;
  serviceId?: string;
  name: string;
  version: string;
  status?: string;
  instances?: number;
  lastSeen?: string;
  lastSeenText?: string;
  agentId?: string; // NEW - Links service to agent
  agentName?: string; // NEW - Agent display name
  description?: string; // NEW - Service description
  url?: string; // NEW - Service URL
}
```

### Agent Model (Updated)

```typescript
export interface Agent {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  apiKeyGenerated?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'online' | 'offline'; // NEW - Agent status
}
```

## Component Implementation

### ServicesList Component

#### Signals

```typescript
services = signal<Service[]>([]);
agents = signal<Agent[]>([]);
selectedAgent = signal<Agent | null>(null);
currentPage = signal(1);
isLoading = signal(false);
isLoadingAgents = signal(false);
```

#### Computed Properties

```typescript
// Filtered services based on selected agent
filteredServices = computed(() => {
  const allServices = this.services();
  const selected = this.selectedAgent();

  if (!selected) {
    return allServices;
  }

  return allServices.filter((service) => service.agentId === selected.id);
});

// Paginated view of filtered services
paginatedServices = computed(() => {
  const filtered = this.filteredServices();
  const page = this.currentPage();
  const startIndex = (page - 1) * this.pageSize;
  return filtered.slice(startIndex, startIndex + this.pageSize);
});

// Total pages for pagination
totalPages = computed(() => {
  return Math.ceil(this.filteredServices().length / this.pageSize) || 1;
});

// Services grouped by agent
servicesByAgent = computed(() => {
  const allServices = this.services();
  const allAgents = this.agents();

  return allAgents.map((agent) => ({
    agent,
    services: allServices.filter((service) => service.agentId === agent.id),
    serviceCount: allServices.filter((service) => service.agentId === agent.id).length,
  }));
});

// Count of active agents
activeAgentsCount = computed(() => {
  return this.servicesByAgent().filter((a) => a.agent.status === 'online').length;
});
```

#### Methods

```typescript
// Load agents from API
loadAgents(): void {
  this.isLoadingAgents.set(true);
  this.dataService.loadAgentsFromApi().subscribe({
    next: (agents) => {
      this.agents.set(agents);
      this.isLoadingAgents.set(false);
    },
    error: (error) => {
      this.notificationService.showError('Failed to load agents', error.message);
      this.isLoadingAgents.set(false);
    },
  });
}

// Load services from API
loadServices(): void {
  this.isLoading.set(true);
  this.dataService.getServices().subscribe({
    next: (services) => {
      this.services.set(services);
      this.isLoading.set(false);
    },
    error: (error) => {
      this.notificationService.showError('Failed to load services', error.message);
      this.isLoading.set(false);
    },
  });
}

// Select an agent to filter services
selectAgent(agent: Agent | null): void {
  this.selectedAgent.set(agent);
  this.currentPage.set(1); // Reset to first page when filtering
}

// Clear agent filter
clearAgentFilter(): void {
  this.selectedAgent.set(null);
  this.currentPage.set(1);
}

// Get agent name by ID
getAgentName(agentId: string): string {
  const agent = this.agents().find(a => a.id === agentId);
  return agent?.name || 'Unknown Agent';
}
```

## UI Components

### Agent Selection Panel

```html
<div class="agent-grid">
  <!-- All Services Card -->
  <div class="agent-card" [class.selected]="!selectedAgent()" (click)="clearAgentFilter()">
    <div class="agent-icon all-services">
      <span class="icon">🌐</span>
    </div>
    <div class="agent-info">
      <h3>All Services</h3>
      <p>{{ services().length }} services total</p>
      <span class="agent-badge all">ALL</span>
    </div>
  </div>

  <!-- Individual Agent Cards -->
  @for (agentData of servicesByAgent(); track agentData.agent.id) {
  <div
    class="agent-card"
    [class.selected]="selectedAgent()?.id === agentData.agent.id"
    (click)="selectAgent(agentData.agent)"
  >
    <div class="agent-icon">
      <span class="icon">🐳</span>
      <div class="status-indicator" [class]="agentData.agent.status || 'offline'"></div>
    </div>
    <div class="agent-info">
      <h3>{{ agentData.agent.name }}</h3>
      <p>{{ agentData.serviceCount }} services</p>
      <span class="agent-badge" [class]="agentData.agent.status || 'offline'">
        {{ (agentData.agent.status || 'offline').toUpperCase() }}
      </span>
    </div>
  </div>
  }
</div>
```

### Services Table with Agent Column

```html
<table>
  <thead>
    <tr>
      <th>Service</th>
      <th>Agent</th>
      <!-- NEW COLUMN -->
      <th>Status</th>
      <th>Instances</th>
      <th>Version</th>
      <th>Last seen</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    @for (service of paginatedServices(); track service.id) {
    <tr>
      <td>
        <strong>{{ service.name }}</strong>
        <small>{{ service.description }}</small>
      </td>
      <td>
        <span class="agent-icon-small">🐳</span>
        {{ getAgentName(service.agentId || '') }}
      </td>
      <!-- Other columns... -->
    </tr>
    }
  </tbody>
</table>
```

### Filter Badge

```html
@if (selectedAgent()) {
<span class="selected-agent-badge">
  🐳 {{ selectedAgent()!.name }} • {{ filteredServices().length }} services
  <button class="btn-clear-filter" (click)="clearAgentFilter()">✕</button>
</span>
}
```

## CSS Styling

### Agent Card Styles

```css
.agent-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--accent);
  transform: translateY(-2px);
}

.agent-card.selected {
  background: rgba(255, 193, 7, 0.1);
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
}
```

### Status Indicators

```css
.status-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
}

.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.status-indicator.offline {
  background: #ef4444;
}
```

### Agent Badges

```css
.agent-badge.all {
  background: rgba(255, 193, 7, 0.2);
  color: var(--accent);
}

.agent-badge.online {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.agent-badge.offline {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
```

## User Flows

### 1. View All Services

1. Navigate to Services page
2. By default, "All Services" card is selected
3. Table shows all services from all agents
4. Agent column shows which agent registered each service

### 2. Filter by Agent

1. Click on an agent card in the selection panel
2. Agent card becomes highlighted with accent color
3. Table filters to show only that agent's services
4. Filter badge appears above table showing selected agent
5. Pagination resets to page 1

### 3. Clear Filter

1. Click the "✕" button in the filter badge
2. OR click the "All Services" card
3. View returns to showing all services

### 4. Navigate Services

1. Select an agent to view their services
2. Click "Details" on any service to view full details
3. Click "Ping" to test service connectivity

## Backend Requirements

### Services API Response

Services should include `agentId` and optionally `agentName`:

```json
GET /api/services

Response:
[
  {
    "id": "service-123",
    "name": "Payment Service",
    "version": "1.2.0",
    "status": "healthy",
    "instances": 3,
    "lastSeen": "2025-10-07T10:30:00Z",
    "agentId": "agent-456",          // REQUIRED
    "agentName": "Production Agent",  // OPTIONAL
    "description": "Handles payment processing",  // OPTIONAL
    "url": "https://api.example.com/payments"     // OPTIONAL
  }
]
```

### Agents API Response

Agents should include `status` field:

```json
GET /api/agents

Response:
[
  {
    "id": "agent-456",
    "name": "Production Agent",
    "url": "https://prod-agent.example.com",
    "apiKey": "****1234",
    "status": "online",              // REQUIRED: 'online' | 'offline'
    "createdAt": "2025-01-15T08:00:00Z",
    "updatedAt": "2025-10-07T10:00:00Z",
    "apiKeyGenerated": "2025-01-15T08:00:00Z"
  }
]
```

## Features in Action

### Agent Selection Panel

- 🌐 **All Services** - Shows all services (default)
- 🐳 **Agent Cards** - Each agent with:
  - Container icon
  - Online/offline status indicator (green/red dot)
  - Service count
  - Status badge (ONLINE/OFFLINE)

### Services Table

- New **Agent** column showing which agent registered each service
- Agent icon (🐳) with agent name
- Filtered view when agent is selected

### Quick Stats (Sidebar)

- 📊 Total Services count
- 🐳 Total Agents count
- ✓ Active Agents count

## Benefits

1. **Clear Organization**: Services are grouped by their managing agents
2. **Easy Filtering**: Quick agent selection for focused views
3. **Status Visibility**: See which agents are online/offline at a glance
4. **Service Distribution**: Understand how services are distributed across agents
5. **Better Monitoring**: Identify which agent is responsible for each service
6. **Responsive Design**: Works on all screen sizes

## Testing Checklist

- [ ] Agent cards load correctly from API
- [ ] Services show correct agent information
- [ ] Clicking agent card filters services
- [ ] "All Services" card shows all services
- [ ] Clear filter button works
- [ ] Status indicators show correct online/offline state
- [ ] Service counts are accurate
- [ ] Pagination works with filtered results
- [ ] Empty state shows when no services for selected agent
- [ ] Agent column displays correct agent names
- [ ] Quick stats show accurate counts
- [ ] Loading states display correctly
- [ ] Responsive layout works on mobile

## Future Enhancements

- [ ] Agent health metrics in cards
- [ ] Search/filter within agent's services
- [ ] Agent performance indicators
- [ ] Bulk operations per agent
- [ ] Agent-specific cache management
- [ ] Service deployment history per agent
- [ ] Agent resource usage indicators
- [ ] Multi-agent selection/comparison

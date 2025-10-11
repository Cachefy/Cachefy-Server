# Agent Status API Integration - Updated Implementation

## Overview

Updated the agent ping functionality to work with the actual backend API structure that returns `AgentPingResponseDto` with `StatusCode` and `Message` properties. Also added agent status display to the service detail page.

## API Response Structure

### Backend DTO

```csharp
public class AgentPingResponseDto
{
    public int StatusCode { get; set; }
    public string? Message { get; set; }
}
```

### Status Codes

- **200**: OK - Agent is online
- **404**: Not Found - Agent doesn't exist or can't be reached
- **503**: Service Unavailable - Agent is down/unavailable
- **408**: Request Timeout - Agent ping timed out

## Implementation Changes

### 1. DataService Updates (`data.ts`)

#### Updated `pingAgent()` Method

```typescript
pingAgent(agentId: string): Observable<{
  status: 'online' | 'offline';
  agentId: string;
  statusCode?: number;
  message?: string
}> {
  return this.http
    .get<{ statusCode: number; message?: string }>(
      `${environment.apiUrl}/agents/${agentId}/ping`,
      { headers: this.getAuthHeaders() }
    )
    .pipe(
      map((response) => {
        // StatusCode 200 = online, all others = offline
        const isOnline = response.statusCode === 200;
        const status: 'online' | 'offline' = isOnline ? 'online' : 'offline';

        // Update agent status in local state
        const agents = [...this.agents()];
        const agentIndex = agents.findIndex((a) => a.id === agentId);

        if (agentIndex >= 0) {
          agents[agentIndex] = { ...agents[agentIndex], status };
          this.agents.set(agents);
        }

        const statusMessage = response.message || this.getStatusMessage(response.statusCode);
        this.addLog(`Pinged agent ${agentId}: ${status} (${response.statusCode} - ${statusMessage})`);

        return {
          status,
          agentId,
          statusCode: response.statusCode,
          message: statusMessage
        };
      }),
      catchError((error) => {
        // Network error - agent is offline
        const agents = [...this.agents()];
        const agentIndex = agents.findIndex((a) => a.id === agentId);

        if (agentIndex >= 0) {
          agents[agentIndex] = { ...agents[agentIndex], status: 'offline' };
          this.agents.set(agents);
        }

        this.addLog(`Agent ${agentId} ping failed: ${error.message}`);
        return of({
          status: 'offline' as const,
          agentId,
          statusCode: error.status || 0,
          message: error.message || 'Network error'
        });
      })
    );
}
```

#### New Helper Method

```typescript
private getStatusMessage(statusCode: number): string {
  switch (statusCode) {
    case 200:
      return 'OK';
    case 404:
      return 'Not Found';
    case 503:
      return 'Service Unavailable';
    case 408:
      return 'Request Timeout';
    default:
      return 'Unknown Status';
  }
}
```

### 2. Service Detail Component (`service-detail.ts`)

#### New Imports

```typescript
import { Agent } from '../../../core/models/agent.model';
```

#### New Signals

```typescript
// Agent status
serviceAgent = signal<Agent | null>(null);
agentStatus = signal<'online' | 'offline' | 'loading'>('loading');
agentStatusMessage = signal<string>('');
```

#### New Methods

**Load Agent Status**

```typescript
private loadAgentStatus(agentId: string) {
  this.agentStatus.set('loading');

  // Get agent details
  const agents = this.dataService.getAgents();
  const agent = agents.find(a => a.id === agentId);

  if (agent) {
    this.serviceAgent.set(agent);
  }

  // Ping agent to get current status
  this.dataService.pingAgent(agentId).subscribe({
    next: (result) => {
      this.agentStatus.set(result.status);
      this.agentStatusMessage.set(result.message || '');

      // Update service agent with latest status
      if (agent) {
        this.serviceAgent.set({ ...agent, status: result.status });
      }
    },
    error: (error) => {
      this.agentStatus.set('offline');
      this.agentStatusMessage.set(error.message || 'Failed to ping agent');
    }
  });
}
```

**Refresh Agent Status**

```typescript
refreshAgentStatus() {
  const service = this.service();
  if (service?.agentId) {
    this.loadAgentStatus(service.agentId);
  }
}
```

#### Updated `loadServiceData()` Method

Now checks if service has an `agentId` and loads agent status:

```typescript
if (foundService) {
  this.service.set(foundService);
  this.isLoading.set(false);

  // Load agent information if service has agentId
  if (foundService.agentId) {
    this.loadAgentStatus(foundService.agentId);
  }

  // Load agent responses...
}
```

### 3. Service Detail HTML (`service-detail.html`)

Added new Agent Status Card between service details and agent responses:

```html
<!-- Agent Status Card -->
@if (serviceAgent()) {
<div class="card" style="margin-top: 16px;">
  <div class="row">
    <h2 class="text-app">Agent Status</h2>
    <button
      class="btn secondary sm"
      (click)="refreshAgentStatus()"
      [disabled]="agentStatus() === 'loading'"
    >
      <svg>...</svg>
      {{ agentStatus() === 'loading' ? 'Checking...' : 'Refresh' }}
    </button>
  </div>

  <div class="agent-status-container">
    <div class="agent-icon-large">
      <span class="icon">🐳</span>
      @if (agentStatus() === 'loading') {
      <div class="status-indicator loading"></div>
      } @else if (agentStatus() === 'online') {
      <div class="status-indicator online"></div>
      } @else {
      <div class="status-indicator offline"></div>
      }
    </div>

    <div class="agent-details">
      <h3>{{ serviceAgent()!.name }}</h3>

      <div>
        <div>Status:</div>
        <div>
          @if (agentStatus() === 'loading') {
          <span class="agent-badge loading">
            <span class="spinner-small"></span>
            CHECKING...
          </span>
          } @else if (agentStatus() === 'online') {
          <span class="agent-badge online">✓ ONLINE</span>
          } @else {
          <span class="agent-badge offline">✗ OFFLINE</span>
          }
        </div>

        <div>URL:</div>
        <div>{{ serviceAgent()!.url }}</div>

        @if (agentStatusMessage()) {
        <div>Message:</div>
        <div>{{ agentStatusMessage() }}</div>
        }
      </div>
    </div>
  </div>
</div>
}
```

### 4. Service Detail CSS (`service-detail.css`)

Added comprehensive styles for agent status display:

```css
/* Agent Status Container */
.agent-status-container {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

/* Large Agent Icon */
.agent-icon-large {
  position: relative;
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  flex-shrink: 0;
}

/* Status Indicators */
.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
  animation: pulse-online 2s infinite;
}

.status-indicator.offline {
  background: #ef4444;
}

.status-indicator.loading {
  background: #f59e0b;
  animation: pulse-loading 1.5s infinite;
}

/* Status Badges */
.agent-badge.online {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.agent-badge.offline {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.agent-badge.loading {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

/* Animations */
@keyframes pulse-online {
  0%,
  100% {
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.9);
  }
}

@keyframes pulse-loading {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

## Visual Features

### Agent Status Card Components

1. **Large Container Icon** (🐳)

   - 72x72px size
   - Rounded corners
   - Shadow effect

2. **Status Indicator Dot**

   - Top-right corner of icon
   - Color-coded:
     - Green with pulse animation = online
     - Orange with fade animation = loading
     - Red = offline

3. **Status Badge**

   - Color-coded background and border
   - Icons: ✓ (online), ✗ (offline)
   - Loading spinner for checking state

4. **Agent Details Grid**

   - Agent name (heading)
   - Status with badge
   - Agent URL
   - Status message (when available)

5. **Refresh Button**
   - Refresh icon
   - Changes text based on status
   - Disabled during loading

### Status States

| State                   | Indicator Color | Badge       | Animation    |
| ----------------------- | --------------- | ----------- | ------------ |
| Online (200)            | Green           | ✓ ONLINE    | Pulsing glow |
| Offline (404, 503, 408) | Red             | ✗ OFFLINE   | None         |
| Loading                 | Orange          | CHECKING... | Fade in/out  |
| Error (network)         | Red             | ✗ OFFLINE   | None         |

## API Integration Flow

```
Service Detail Page Load
         ↓
Service has agentId?
         ↓ YES
Load agent from agents list
         ↓
Call pingAgent(agentId)
         ↓
GET /api/agents/{agentId}/ping
         ↓
Response: { statusCode: 200, message: "OK" }
         ↓
Parse statusCode:
  - 200 → online
  - 404/503/408 → offline
         ↓
Update UI:
  - Green indicator with pulse
  - "✓ ONLINE" badge
  - Display agent URL
  - Display message
```

## Backend API Requirements

### Endpoint

```
GET /api/agents/{agentId}/ping
```

### Response Format

```json
{
  "statusCode": 200,
  "message": "OK"
}
```

### Status Codes

- **200**: Agent is online and responding
- **404**: Agent not found or unreachable
- **503**: Agent service unavailable
- **408**: Agent ping timeout

### C# Implementation Example

```csharp
[HttpGet("{agentId}/ping")]
public async Task<ActionResult<AgentPingResponseDto>> PingAgent(string agentId)
{
    try
    {
        var agent = await _agentRepository.GetByIdAsync(agentId);
        if (agent == null)
        {
            return Ok(new AgentPingResponseDto
            {
                StatusCode = 404,
                Message = "Agent not found"
            });
        }

        // Try to ping the agent's endpoint
        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(5);

        var response = await httpClient.GetAsync($"{agent.Url}/health");

        if (response.IsSuccessStatusCode)
        {
            return Ok(new AgentPingResponseDto
            {
                StatusCode = 200,
                Message = "OK"
            });
        }

        return Ok(new AgentPingResponseDto
        {
            StatusCode = 503,
            Message = "Service Unavailable"
        });
    }
    catch (TaskCanceledException)
    {
        return Ok(new AgentPingResponseDto
        {
            StatusCode = 408,
            Message = "Request Timeout"
        });
    }
    catch (Exception ex)
    {
        return Ok(new AgentPingResponseDto
        {
            StatusCode = 503,
            Message = ex.Message
        });
    }
}
```

## Usage Scenarios

### Scenario 1: Agent Online

```
User opens service detail page
→ Service has agentId: "agent-123"
→ Component pings agent
→ API returns: { statusCode: 200, message: "OK" }
→ UI shows:
  - Green pulsing indicator
  - "✓ ONLINE" badge in green
  - Agent URL displayed
  - Message: "OK"
```

### Scenario 2: Agent Not Found

```
User opens service detail page
→ Service has agentId: "agent-456"
→ Component pings agent
→ API returns: { statusCode: 404, message: "Agent not found" }
→ UI shows:
  - Red indicator
  - "✗ OFFLINE" badge in red
  - Agent URL displayed
  - Message: "Agent not found"
```

### Scenario 3: Agent Timeout

```
User opens service detail page
→ Service has agentId: "agent-789"
→ Component pings agent
→ API returns: { statusCode: 408, message: "Request Timeout" }
→ UI shows:
  - Red indicator
  - "✗ OFFLINE" badge in red
  - Agent URL displayed
  - Message: "Request Timeout"
```

### Scenario 4: Manual Refresh

```
User clicks "Refresh" button
→ Status changes to "loading"
→ UI shows:
  - Orange fading indicator
  - "CHECKING..." badge with spinner
  - Button disabled
→ Ping completes
→ UI updates with new status
→ Button re-enabled
```

## Files Modified

1. ✅ `src/app/core/services/data.ts`

   - Updated `pingAgent()` to handle `AgentPingResponseDto`
   - Added `getStatusMessage()` helper method
   - Updated `pingAllAgents()` return type

2. ✅ `src/app/features/services/service-detail/service-detail.ts`

   - Added Agent import
   - Added agent status signals
   - Added `loadAgentStatus()` method
   - Added `refreshAgentStatus()` method
   - Updated `loadServiceData()` to load agent status

3. ✅ `src/app/features/services/service-detail/service-detail.html`

   - Added Agent Status Card
   - Added status indicators and badges
   - Added refresh button
   - Added conditional rendering for status states

4. ✅ `src/app/features/services/service-detail/service-detail.css`
   - Added agent status container styles
   - Added large icon styles
   - Added status indicator styles with animations
   - Added badge styles for all states
   - Added responsive styles

## Testing Checklist

- [ ] Service detail page loads without errors
- [ ] Agent status card appears when service has agentId
- [ ] Agent status card hidden when service has no agentId
- [ ] Ping is automatically called on page load
- [ ] Status shows "loading" during ping
- [ ] Status shows "online" with green indicator for statusCode 200
- [ ] Status shows "offline" with red indicator for statusCode 404/503/408
- [ ] Status message displays correctly
- [ ] Refresh button works and re-pings agent
- [ ] Refresh button disables during loading
- [ ] Pulse animation works for online status
- [ ] Fade animation works for loading status
- [ ] Responsive layout works on mobile

## Benefits

1. **Real-Time Status**: See current agent status directly on service detail page
2. **Visual Feedback**: Clear color-coded indicators and animations
3. **Status Messages**: Detailed information about agent state
4. **Manual Refresh**: Ability to re-check agent status on demand
5. **Comprehensive Info**: Agent name, URL, status, and message all in one place
6. **Responsive Design**: Works on all screen sizes
7. **Loading States**: Clear visual feedback during ping operation

---

**Related Documentation:**

- `AGENT-STATUS-PING.md` - Original ping feature documentation
- `AGENT-BASED-SERVICES.md` - Agent-based services feature

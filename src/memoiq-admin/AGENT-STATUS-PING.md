# Agent Status Ping Feature

## Overview

Agent status is now determined by pinging each agent through the API endpoint `/agents/ping`. This provides real-time status information for each agent.

## How It Works

### 1. Agent Ping Endpoint

The system calls `GET /api/agents/ping?agentId={agentId}` for each agent to determine if it's online or offline.

### API Response

```json
GET /api/agents/ping?agentId=agent-123

Success Response (Agent is Online):
{
  "status": "ok"  // or "online"
}

Error Response (Agent is Offline):
- HTTP error (timeout, 404, 500, etc.)
- OR { "status": "offline" } / { "status": "error" }
```

### 2. Status Determination

- **Online**: API returns status "ok" or "online" with HTTP 200
- **Offline**: API returns error, timeout, or any non-ok status

## Implementation

### DataService Methods

#### `pingAgent(agentId: string)`

Pings a single agent and updates its status.

```typescript
pingAgent(agentId: string): Observable<{ status: 'online' | 'offline'; agentId: string }> {
  return this.http
    .get<{ status: string }>(`${environment.apiUrl}/agents/ping?agentId=${agentId}`, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      map((response) => {
        const isOnline = response.status === 'ok' || response.status === 'online';
        const status: 'online' | 'offline' = isOnline ? 'online' : 'offline';

        // Update the agent's status in local state
        const agents = [...this.agents()];
        const agentIndex = agents.findIndex((a) => a.id === agentId);

        if (agentIndex >= 0) {
          agents[agentIndex] = { ...agents[agentIndex], status };
          this.agents.set(agents);
        }

        this.addLog(`Pinged agent ${agentId}: ${status}`);
        return { status, agentId };
      }),
      catchError((error) => {
        // If ping fails, agent is offline
        const agents = [...this.agents()];
        const agentIndex = agents.findIndex((a) => a.id === agentId);

        if (agentIndex >= 0) {
          agents[agentIndex] = { ...agents[agentIndex], status: 'offline' };
          this.agents.set(agents);
        }

        this.addLog(`Agent ${agentId} ping failed: ${error.message}`);
        return of({ status: 'offline' as const, agentId });
      })
    );
}
```

#### `pingAllAgents()`

Pings all agents in parallel and returns aggregated results.

```typescript
pingAllAgents(): Observable<{ status: 'online' | 'offline'; agentId: string }[]> {
  const agents = this.agents();
  if (agents.length === 0) {
    return of([]);
  }

  // Create an array of ping observables
  const pingObservables = agents.map((agent) => this.pingAgent(agent.id));

  // Execute all pings in parallel
  return new Observable((observer) => {
    const results: { status: 'online' | 'offline'; agentId: string }[] = [];
    let completed = 0;

    pingObservables.forEach((ping$) => {
      ping$.subscribe({
        next: (result) => {
          results.push(result);
          completed++;

          if (completed === pingObservables.length) {
            observer.next(results);
            observer.complete();
          }
        },
        error: (error) => {
          completed++;
          if (completed === pingObservables.length) {
            observer.next(results);
            observer.complete();
          }
        },
      });
    });
  });
}
```

### ServicesList Component Integration

The services list component automatically pings all agents after loading them:

```typescript
loadAgents() {
  this.isLoadingAgents.set(true);

  this.dataService.loadAgentsFromApi().subscribe({
    next: (agents) => {
      this.agents.set(agents);
      this.isLoadingAgents.set(false);

      // Ping all agents to update their status
      this.pingAllAgents();
    },
    error: (error) => {
      console.error('Failed to load agents:', error);
      this.notificationService.showError('Failed to load agents', error.message);
      this.isLoadingAgents.set(false);
    },
  });
}

pingAllAgents() {
  this.dataService.pingAllAgents().subscribe({
    next: (results) => {
      const onlineCount = results.filter(r => r.status === 'online').length;
      console.log(`Agent ping complete: ${onlineCount}/${results.length} agents online`);
    },
    error: (error) => {
      console.error('Error pinging agents:', error);
    }
  });
}
```

## Flow Diagram

```
1. User opens Services page
   ↓
2. Component loads agents from API
   GET /api/agents → Agent[]
   ↓
3. Component pings all agents in parallel
   GET /api/agents/ping?agentId=agent-1
   GET /api/agents/ping?agentId=agent-2
   GET /api/agents/ping?agentId=agent-3
   ↓
4. Each ping updates agent status in real-time
   - Success (HTTP 200, status: "ok") → online
   - Error (timeout, 404, 500) → offline
   ↓
5. UI updates with status indicators
   - Green dot with glow = online
   - Red dot = offline
```

## Visual Indicators

### Agent Card Status

```html
<div class="agent-icon">
  <span class="icon">🐳</span>
  @if (agentData.agent.status === 'online') {
  <div class="status-indicator online"></div>
  } @else {
  <div class="status-indicator offline"></div>
  }
</div>
```

### CSS Styles

```css
.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); /* Pulsing glow effect */
}

.status-indicator.offline {
  background: #ef4444;
}
```

### Agent Badge

```html
<span class="agent-badge" [class]="agentData.agent.status || 'offline'">
  {{ (agentData.agent.status || 'offline').toUpperCase() }}
</span>
```

## Backend Requirements

### Ping Endpoint

The backend must implement the `/agents/ping` endpoint:

```
GET /api/agents/ping?agentId={agentId}

Success Response (HTTP 200):
{
  "status": "ok"
}

OR

{
  "status": "online"
}

Error Response:
- HTTP 404: Agent not found
- HTTP 500: Server error
- HTTP 408: Timeout
- Any non-200 status code indicates offline
```

### Implementation Examples

#### Node.js/Express Example

```javascript
app.get('/api/agents/ping', async (req, res) => {
  const { agentId } = req.query;

  try {
    // Check if agent exists and is reachable
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ status: 'offline', error: 'Agent not found' });
    }

    // Try to ping the agent's endpoint
    const agentResponse = await fetch(agent.url + '/health', { timeout: 5000 });

    if (agentResponse.ok) {
      return res.json({ status: 'ok' });
    } else {
      return res.status(503).json({ status: 'offline' });
    }
  } catch (error) {
    return res.status(503).json({ status: 'offline', error: error.message });
  }
});
```

#### .NET Example

```csharp
[HttpGet("ping")]
public async Task<IActionResult> PingAgent([FromQuery] string agentId)
{
    try
    {
        var agent = await _agentRepository.GetByIdAsync(agentId);
        if (agent == null)
        {
            return NotFound(new { status = "offline", error = "Agent not found" });
        }

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(5);

        var response = await httpClient.GetAsync($"{agent.Url}/health");

        if (response.IsSuccessStatusCode)
        {
            return Ok(new { status = "ok" });
        }

        return StatusCode(503, new { status = "offline" });
    }
    catch (Exception ex)
    {
        return StatusCode(503, new { status = "offline", error = ex.Message });
    }
}
```

## Benefits

1. **Real-Time Status**: Agents are pinged on page load for current status
2. **Automatic Updates**: Agent status is automatically updated in the UI
3. **Error Handling**: Failed pings gracefully mark agents as offline
4. **Parallel Execution**: All agents are pinged simultaneously for speed
5. **Visual Feedback**: Clear online/offline indicators with color coding
6. **State Management**: Status is stored in local state for quick access

## Usage Scenarios

### Scenario 1: All Agents Online

```
User opens Services page
→ 3 agents loaded
→ All pings successful (HTTP 200, status: "ok")
→ All agents show green dot + "ONLINE" badge
→ Quick stats: "✓ Active Agents: 3"
```

### Scenario 2: Mixed Status

```
User opens Services page
→ 3 agents loaded
→ Agent 1: Success → online (green)
→ Agent 2: Timeout → offline (red)
→ Agent 3: Success → online (green)
→ Quick stats: "✓ Active Agents: 2"
```

### Scenario 3: All Agents Offline

```
User opens Services page
→ 3 agents loaded
→ All pings fail (timeout/error)
→ All agents show red dot + "OFFLINE" badge
→ Quick stats: "✓ Active Agents: 0"
```

## Performance Considerations

### Timeout Configuration

- Default HTTP timeout: 5 seconds per ping
- Adjust based on network conditions
- Consider agent location (local vs. remote)

### Parallel Execution

- All agents pinged simultaneously
- No sequential delays
- Total time ≈ slowest single ping time

### Caching Strategy

- Status cached in component state
- No automatic refresh (manual page reload required)
- Consider implementing:
  - Auto-refresh every X seconds
  - Manual refresh button
  - Real-time status via WebSocket

## Future Enhancements

- [ ] Auto-refresh agent status every 30 seconds
- [ ] Manual refresh button for immediate update
- [ ] Real-time status updates via WebSocket
- [ ] Agent health metrics (response time, uptime %)
- [ ] Historical status tracking
- [ ] Alert notifications when agent goes offline
- [ ] Retry logic for failed pings
- [ ] Configurable timeout per agent
- [ ] Batch ping optimization for many agents

## Testing

### Test Cases

1. **All Agents Online**

   - Mock API returns { status: "ok" } for all
   - Verify all show green indicators

2. **All Agents Offline**

   - Mock API returns 503/timeout for all
   - Verify all show red indicators

3. **Mixed Status**

   - Mock some success, some failure
   - Verify correct indicators per agent

4. **API Error Handling**

   - Mock network error
   - Verify graceful degradation to offline

5. **Empty Agent List**
   - No agents loaded
   - Verify no errors, empty state shown

### Manual Testing Steps

1. Open Services page
2. Check browser console for ping logs
3. Verify status indicators match actual agent status
4. Check Quick Stats counts are accurate
5. Filter by online/offline agents
6. Reload page and verify status updates

## Troubleshooting

### Agents Always Show Offline

**Possible Causes:**

- Backend `/agents/ping` endpoint not implemented
- CORS issues preventing API calls
- Network timeout too short
- Agent URLs are unreachable

**Solutions:**

- Verify endpoint exists and returns correct format
- Check CORS configuration on backend
- Increase timeout value
- Test agent URLs directly

### Ping Takes Too Long

**Possible Causes:**

- Many agents being pinged
- Slow network connections
- High timeout values

**Solutions:**

- Optimize backend ping implementation
- Reduce timeout value
- Implement caching strategy
- Use WebSocket for real-time updates

---

**Related Documentation:**

- `AGENT-BASED-SERVICES.md` - Agent-based services feature
- `AGENT-BASED-SERVICES-SUMMARY.md` - Quick reference guide

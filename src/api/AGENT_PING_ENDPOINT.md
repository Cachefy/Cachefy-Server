# Agent Ping Endpoint

## Date

October 7, 2025

## Overview

Added a new `ping` endpoint to the AgentsController that checks if an agent is reachable by calling its health endpoint and returning only the HTTP status code.

---

## Implementation

### Endpoint Details

**Route:** `GET /api/agents/{id}/ping`

**Authentication:** Requires JWT Bearer token (inherited from `[Authorize]` on controller)

**Purpose:** Health check to verify if an agent is online and reachable

**Timeout:** 5 seconds

---

### Code Changes

**File:** `VolatixServer.Api/Controllers/AgentsController.cs`

#### 1. Added IHttpClientFactory Dependency

**Before:**

```csharp
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;

    public AgentsController(IAgentService agentService)
    {
        _agentService = agentService;
    }
```

**After:**

```csharp
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly IHttpClientFactory _httpClientFactory;

    public AgentsController(IAgentService agentService, IHttpClientFactory httpClientFactory)
    {
        _agentService = agentService;
        _httpClientFactory = httpClientFactory;
    }
```

#### 2. Added PingAgent Method

```csharp
/// <summary>
/// Ping an agent to check if it's reachable
/// </summary>
/// <param name="id">The agent ID</param>
/// <returns>HTTP status code from the agent's health endpoint</returns>
[HttpGet("{id}/ping")]
public async Task<ActionResult<int>> PingAgent(string id)
{
    try
    {
        // Get the agent details
        var agent = await _agentService.GetAgentByIdAsync(id);

        // Create HTTP client
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(5); // 5 second timeout

        // Construct the ping URL (assuming agent has a health endpoint)
        var pingUrl = $"{agent.Url.TrimEnd('/')}/health";

        try
        {
            // Make the request to the external API
            var response = await client.GetAsync(pingUrl);

            // Return only the status code
            return Ok((int)response.StatusCode);
        }
        catch (HttpRequestException ex)
        {
            // Network error or connection refused
            return Ok(new
            {
                statusCode = 503, // Service Unavailable
                message = $"Failed to reach agent: {ex.Message}"
            });
        }
        catch (TaskCanceledException)
        {
            // Timeout
            return Ok(new
            {
                statusCode = 408, // Request Timeout
                message = "Agent did not respond within timeout period"
            });
        }
    }
    catch (KeyNotFoundException ex)
    {
        return NotFound(new { message = ex.Message });
    }
}
```

---

## Usage Examples

### 1. Using PowerShell

```powershell
# Login to get JWT token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token

# Get agent ID (assuming you have an agent)
$agents = Invoke-RestMethod -Uri "http://localhost:5046/api/agents" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

$agentId = $agents[0].id

# Ping the agent
$pingResult = Invoke-RestMethod -Uri "http://localhost:5046/api/agents/$agentId/ping" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "Agent Status Code: $pingResult"
```

### 2. Using cURL

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:5046/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@volatix.com","password":"admin123"}' | jq -r '.token')

# Get agent ID
AGENT_ID=$(curl -X GET http://localhost:5046/api/agents \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

# Ping agent
curl -X GET "http://localhost:5046/api/agents/$AGENT_ID/ping" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Using Angular/TypeScript

```typescript
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AgentService {
  private apiUrl = "http://localhost:5046/api/agents";

  constructor(private http: HttpClient) {}

  pingAgent(agentId: string, token: string): Observable<number> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<number>(`${this.apiUrl}/${agentId}/ping`, { headers });
  }
}
```

**Component Usage:**

```typescript
export class AgentListComponent {
  constructor(private agentService: AgentService) {}

  checkAgentHealth(agentId: string) {
    const token = localStorage.getItem("token");

    this.agentService.pingAgent(agentId, token!).subscribe({
      next: (statusCode) => {
        console.log("Agent status:", statusCode);

        if (statusCode === 200) {
          alert("Agent is online and healthy! ✅");
        } else if (statusCode === 503) {
          alert("Agent is unreachable ❌");
        } else if (statusCode === 408) {
          alert("Agent timeout - no response ⏱️");
        } else {
          alert(`Agent returned status: ${statusCode}`);
        }
      },
      error: (err) => {
        console.error("Error pinging agent:", err);
        alert("Failed to ping agent");
      },
    });
  }
}
```

### 4. Using Fetch API (Browser Console)

```javascript
// Get token
const loginResponse = await fetch("http://localhost:5046/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@volatix.com", password: "admin123" }),
});
const { token } = await loginResponse.json();

// Get agents
const agentsResponse = await fetch("http://localhost:5046/api/agents", {
  headers: { Authorization: `Bearer ${token}` },
});
const agents = await agentsResponse.json();
const agentId = agents[0].id;

// Ping agent
const pingResponse = await fetch(
  `http://localhost:5046/api/agents/${agentId}/ping`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
const statusCode = await pingResponse.json();
console.log("Agent Status Code:", statusCode);
```

---

## Response Examples

### Success Scenarios

#### 1. Agent is Online and Healthy

```http
GET /api/agents/abc123/ping
Authorization: Bearer {jwt_token}

Response: 200 OK
Content-Type: application/json

200
```

#### 2. Agent Returned Different Status

```http
GET /api/agents/abc123/ping
Authorization: Bearer {jwt_token}

Response: 200 OK
Content-Type: application/json

503
```

_Note: Even if the agent returns a non-200 status, the ping endpoint returns 200 OK with the agent's status code in the body._

---

### Error Scenarios

#### 1. Agent Not Found

```http
GET /api/agents/invalid-id/ping
Authorization: Bearer {jwt_token}

Response: 404 Not Found
Content-Type: application/json

{
  "message": "Agent with ID invalid-id not found"
}
```

#### 2. Agent Unreachable (Network Error)

```http
GET /api/agents/abc123/ping
Authorization: Bearer {jwt_token}

Response: 200 OK
Content-Type: application/json

{
  "statusCode": 503,
  "message": "Failed to reach agent: No connection could be made because the target machine actively refused it"
}
```

#### 3. Agent Timeout (No Response)

```http
GET /api/agents/abc123/ping
Authorization: Bearer {jwt_token}

Response: 200 OK
Content-Type: application/json

{
  "statusCode": 408,
  "message": "Agent did not respond within timeout period"
}
```

#### 4. Unauthorized (Missing or Invalid Token)

```http
GET /api/agents/abc123/ping

Response: 401 Unauthorized
```

---

## Status Code Meanings

| Status Code | Meaning               | Description                              |
| ----------- | --------------------- | ---------------------------------------- |
| `200`       | OK                    | Agent is healthy and responding normally |
| `204`       | No Content            | Agent is up but returned empty response  |
| `400`       | Bad Request           | Agent received malformed request         |
| `401`       | Unauthorized          | Agent requires authentication            |
| `403`       | Forbidden             | Agent denied access                      |
| `404`       | Not Found             | Agent's health endpoint doesn't exist    |
| `408`       | Request Timeout       | Agent didn't respond within 5 seconds    |
| `500`       | Internal Server Error | Agent has internal error                 |
| `502`       | Bad Gateway           | Agent is behind a proxy that failed      |
| `503`       | Service Unavailable   | Agent is unreachable/offline             |
| `504`       | Gateway Timeout       | Agent proxy/gateway timeout              |

---

## External API Contract

The ping endpoint assumes the external agent has a **health endpoint** at:

```
GET {agentUrl}/health
```

### Example Agent Health Endpoint

Your service fabric agents should implement this endpoint:

```csharp
[ApiController]
[Route("api")]
public class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            service = "MyServiceAgent",
            version = "1.0.0"
        });
    }
}
```

**Or a simple version:**

```csharp
[HttpGet("health")]
public IActionResult Health()
{
    return Ok("healthy");
}
```

**Minimal version:**

```csharp
[HttpGet("health")]
public IActionResult Health() => Ok();
```

---

## Configuration

### Timeout Adjustment

The default timeout is **5 seconds**. To change this:

```csharp
client.Timeout = TimeSpan.FromSeconds(10); // 10 seconds
```

### Custom Health Endpoint Path

If your agents use a different health endpoint path (e.g., `/api/status` or `/ping`), update the code:

```csharp
var pingUrl = $"{agent.Url.TrimEnd('/')}/api/status"; // Custom path
```

### Configurable Path (Future Enhancement)

You could add a `HealthEndpoint` property to the Agent model:

```csharp
public class Agent : BaseEntity
{
    public string Name { get; set; }
    public string Url { get; set; }
    public string ApiKey { get; set; }
    public bool IsApiKeyActive { get; set; }
    public string HealthEndpoint { get; set; } = "/health"; // Default
}
```

Then use it in the ping method:

```csharp
var pingUrl = $"{agent.Url.TrimEnd('/')}{agent.HealthEndpoint}";
```

---

## Monitoring Use Cases

### 1. Health Dashboard

Display agent status in real-time:

```typescript
export class AgentHealthDashboard {
  agents: Agent[] = [];
  healthStatus: Map<string, number> = new Map();

  async ngOnInit() {
    this.agents = await this.loadAgents();
    await this.checkAllAgents();

    // Poll every 30 seconds
    setInterval(() => this.checkAllAgents(), 30000);
  }

  async checkAllAgents() {
    for (const agent of this.agents) {
      try {
        const status = await this.agentService.pingAgent(agent.id).toPromise();
        this.healthStatus.set(agent.id, status);
      } catch {
        this.healthStatus.set(agent.id, 503);
      }
    }
  }

  getStatusColor(agentId: string): string {
    const status = this.healthStatus.get(agentId);
    if (status === 200) return "green";
    if (status === 408) return "orange";
    return "red";
  }
}
```

### 2. Automated Alerts

Send notifications when agents go down:

```csharp
public class AgentMonitoringService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var agents = await _agentService.GetAllAgentsAsync();

            foreach (var agent in agents)
            {
                var statusCode = await PingAgentInternal(agent.Id);

                if (statusCode != 200)
                {
                    // Send alert
                    await _alertService.SendAlertAsync(
                        $"Agent {agent.Name} is down (Status: {statusCode})"
                    );
                }
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

### 3. Load Balancing

Choose healthy agents for requests:

```csharp
public async Task<Agent> GetHealthyAgentAsync(string serviceName)
{
    var agents = await _agentRepository.QueryAsync(
        "SELECT * FROM c WHERE c.serviceName = @serviceName",
        new { serviceName }
    );

    foreach (var agent in agents)
    {
        var statusCode = await PingAgent(agent.Id);
        if (statusCode == 200)
        {
            return agent; // Return first healthy agent
        }
    }

    throw new InvalidOperationException("No healthy agents available");
}
```

---

## Testing

### Manual Test Script

```powershell
# Test script for agent ping endpoint

$baseUrl = "http://localhost:5046"

# 1. Login
Write-Host "1. Logging in..." -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token
Write-Host "✅ Logged in successfully" -ForegroundColor Green

# 2. Get agents
Write-Host "`n2. Fetching agents..." -ForegroundColor Cyan
$agents = Invoke-RestMethod -Uri "$baseUrl/api/agents" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}

Write-Host "✅ Found $($agents.Count) agent(s)" -ForegroundColor Green

# 3. Ping each agent
Write-Host "`n3. Pinging agents..." -ForegroundColor Cyan
foreach ($agent in $agents) {
    Write-Host "`nAgent: $($agent.name)" -ForegroundColor Yellow
    Write-Host "  URL: $($agent.url)" -ForegroundColor Gray
    Write-Host "  ID: $($agent.id)" -ForegroundColor Gray

    try {
        $pingResult = Invoke-RestMethod -Uri "$baseUrl/api/agents/$($agent.id)/ping" `
            -Method Get `
            -Headers @{"Authorization" = "Bearer $token"}

        if ($pingResult -is [int]) {
            $statusCode = $pingResult
        } else {
            $statusCode = $pingResult.statusCode
        }

        switch ($statusCode) {
            200 { Write-Host "  Status: ✅ HEALTHY (200)" -ForegroundColor Green }
            408 { Write-Host "  Status: ⏱️  TIMEOUT (408)" -ForegroundColor Yellow }
            503 { Write-Host "  Status: ❌ UNREACHABLE (503)" -ForegroundColor Red }
            default { Write-Host "  Status: ⚠️  UNKNOWN ($statusCode)" -ForegroundColor Magenta }
        }

        if ($pingResult.message) {
            Write-Host "  Message: $($pingResult.message)" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "  Status: ❌ ERROR" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Ping test completed!" -ForegroundColor Green
```

---

## Summary

✅ **Added:** `GET /api/agents/{id}/ping` endpoint

✅ **Purpose:** Health check for external service fabric agents

✅ **Returns:** HTTP status code from agent's `/health` endpoint

✅ **Timeout:** 5 seconds

✅ **Error Handling:**

- 503 for unreachable agents
- 408 for timeout
- 404 for agent not found

✅ **Authentication:** Requires JWT Bearer token

✅ **Build:** Succeeded with no errors

The ping endpoint allows you to monitor agent health and build automated monitoring systems! 🚀

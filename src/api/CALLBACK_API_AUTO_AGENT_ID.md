# Callback API - Automatic Agent ID Assignment

## Date

October 3, 2025

## Overview

Updated the `/api/callback/register-service` endpoint to automatically extract the Agent ID from the API Key instead of requiring it in the request body. This improves security and simplifies the API for service registration.

---

## Changes Made

### 1. Updated ApiKeyValidationMiddleware

**File:** `VolatixServer.Api/Middleware/ApiKeyValidationMiddleware.cs`

**Change:** Store the authenticated agent in `HttpContext.Items` for use in controllers.

**Before:**

```csharp
if (agent == null)
{
    context.Response.StatusCode = 401;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync("{\"message\":\"Invalid API Key\"}");
    return;
}

// API Key is valid, proceed to the next middleware/controller
await _next(context);
```

**After:**

```csharp
if (agent == null)
{
    context.Response.StatusCode = 401;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync("{\"message\":\"Invalid API Key\"}");
    return;
}

// Store the agent in HttpContext for use in controllers
context.Items["Agent"] = agent;

// API Key is valid, proceed to the next middleware/controller
await _next(context);
```

**Purpose:** Makes the authenticated agent available to controllers without additional database queries.

---

### 2. Updated CallbackController

**File:** `VolatixServer.Api/Controllers/CallbackController.cs`

**Change:** Extract agent from `HttpContext.Items` and automatically set the `AgentId` on the service.

**Before:**

```csharp
[HttpPost("register-service")]
public async Task<ActionResult<ServiceResponseDto>> RegisterService([FromBody] CreateServiceDto createServiceDto)
{
    try
    {
        _logger.LogInformation("Service registration request received");

        // Create the service
        var service = await _serviceService.CreateServiceAsync(createServiceDto);

        _logger.LogInformation(
            "Service '{ServiceName}' registered successfully with ID: {ServiceId}",
            service.Name,
            service.Id
        );

        return CreatedAtAction(
            nameof(RegisterService),
            new { id = service.Id },
            service
        );
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error registering service");
        return StatusCode(500, new { message = "An error occurred while registering the service" });
    }
}
```

**After:**

```csharp
[HttpPost("register-service")]
public async Task<ActionResult<ServiceResponseDto>> RegisterService([FromBody] CreateServiceDto createServiceDto)
{
    try
    {
        _logger.LogInformation("Service registration request received");

        // Get the agent from HttpContext (set by ApiKeyValidationMiddleware)
        var agent = HttpContext.Items["Agent"] as Infrastructure.Models.Agent;

        if (agent == null)
        {
            _logger.LogError("Agent not found in HttpContext");
            return BadRequest(new { message = "Agent information is missing" });
        }

        // Override the agentId with the authenticated agent's ID
        createServiceDto.AgentId = agent.Id;

        _logger.LogInformation(
            "Registering service '{ServiceName}' for agent '{AgentName}' (ID: {AgentId})",
            createServiceDto.Name,
            agent.Name,
            agent.Id
        );

        // Create the service
        var service = await _serviceService.CreateServiceAsync(createServiceDto);

        _logger.LogInformation(
            "Service '{ServiceName}' registered successfully with ID: {ServiceId}",
            service.Name,
            service.Id
        );

        return CreatedAtAction(
            nameof(RegisterService),
            new { id = service.Id },
            service
        );
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error registering service");
        return StatusCode(500, new { message = "An error occurred while registering the service" });
    }
}
```

**Purpose:**

- Automatically associates the service with the agent that owns the API Key
- Prevents clients from spoofing agent IDs
- Simplifies the request body (no need to include `agentId`)

---

## API Changes

### Register Service Endpoint

**Endpoint:** `POST /api/callback/register-service`

**Authentication:** API Key via `X-Api-Key` header (required)

### Old Request Body

```json
{
  "name": "MyService",
  "description": "My service description",
  "port": 8080,
  "status": "Running",
  "agentId": "agent-id-here" // ← REQUIRED before
}
```

### New Request Body

```json
{
  "name": "MyService",
  "description": "My service description",
  "port": 8080,
  "status": "Running"
  // agentId is now OPTIONAL and will be ignored if provided
}
```

**Note:** If `agentId` is provided in the request body, it will be **overridden** with the agent ID associated with the API Key.

---

## Benefits

### 1. **Enhanced Security**

- Prevents API Key spoofing (clients can't register services under other agents)
- Agent ID is derived from the authenticated API Key, not user input
- Eliminates potential for authorization bypass

### 2. **Simplified API**

- Clients no longer need to know or provide the agent ID
- One less field to include in the request body
- Reduces client-side errors

### 3. **Better Logging**

- Added logging that shows which agent is registering which service
- Easier to audit and troubleshoot service registrations

### 4. **Improved Developer Experience**

- Clearer intent: "This API Key authorizes you to register services for Agent X"
- Less confusion about what agent ID to use
- Automatic association reduces boilerplate code

---

## Usage Example

### PowerShell Example

```powershell
# 1. Login as admin to get JWT token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" `
    -Method Post `
    -Body '{"email":"admin@volatix.com","password":"admin123"}' `
    -ContentType "application/json"

$token = $loginResponse.token

# 2. Create an agent
$agentResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/agents" `
    -Method Post `
    -Body '{"name":"Production Agent","url":"https://prod-agent.example.com"}' `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

$apiKey = $agentResponse.apiKey
Write-Host "Agent API Key: $apiKey"

# 3. Register a service using the API Key (NO agentId needed!)
$serviceRequest = @{
    name = "UserService"
    description = "Handles user management"
    port = 8080
    status = "Running"
    # Note: agentId is NOT included - it's automatically set!
} | ConvertTo-Json

$serviceResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" `
    -Method Post `
    -Body $serviceRequest `
    -Headers @{
        "X-Api-Key" = $apiKey
        "Content-Type" = "application/json"
    }

Write-Host "Service registered with ID: $($serviceResponse.id)"
Write-Host "Service associated with Agent ID: $($serviceResponse.agentId)"
```

---

## cURL Example

```bash
# Register a service (agentId automatically extracted from API Key)
curl -X POST http://localhost:5046/api/callback/register-service \
  -H "X-Api-Key: ak_1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OrderService",
    "description": "Handles order processing",
    "port": 9000,
    "status": "Running"
  }'
```

**Response:**

```json
{
  "id": "service-guid-here",
  "name": "OrderService",
  "description": "Handles order processing",
  "port": 9000,
  "status": "Running",
  "agentId": "agent-guid-from-api-key", // ← Automatically set!
  "createdAt": "2025-10-03T10:30:00Z",
  "updatedAt": "2025-10-03T10:30:00Z"
}
```

---

## Migration Guide

### For Existing Clients

**Option 1: Remove agentId from request body (Recommended)**

```javascript
// Before
const response = await fetch("/api/callback/register-service", {
  method: "POST",
  headers: {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "MyService",
    description: "Service description",
    port: 8080,
    status: "Running",
    agentId: "some-agent-id", // ← Remove this
  }),
});

// After
const response = await fetch("/api/callback/register-service", {
  method: "POST",
  headers: {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "MyService",
    description: "Service description",
    port: 8080,
    status: "Running",
    // agentId removed - it's automatic!
  }),
});
```

**Option 2: Keep agentId in request body (Backward Compatible)**

```javascript
// This still works, but the agentId will be ignored and overridden
const response = await fetch("/api/callback/register-service", {
  method: "POST",
  headers: {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "MyService",
    description: "Service description",
    port: 8080,
    status: "Running",
    agentId: "ignored-value", // This will be overridden
  }),
});
```

---

## Security Implications

### Before (Security Risk)

```
Client sends:
- API Key: "ak_agent1_key"
- agentId: "agent2_id"

Result: Service registered under Agent 2, even though Agent 1's key was used!
```

### After (Secure)

```
Client sends:
- API Key: "ak_agent1_key"
- agentId: "agent2_id" (or omitted)

Result: Service registered under Agent 1 (from API Key), agentId parameter ignored
```

---

## Testing

### Test 1: Register service without agentId

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" `
    -Method Post `
    -Body '{"name":"TestService","description":"Test","port":8080,"status":"Running"}' `
    -Headers @{
        "X-Api-Key" = "your-api-key-here"
        "Content-Type" = "application/json"
    }

# Verify agentId is set
Write-Host "Agent ID: $($response.agentId)"
```

### Test 2: Try to register service with wrong agentId (should be overridden)

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" `
    -Method Post `
    -Body '{"name":"TestService2","description":"Test","port":8081,"status":"Running","agentId":"wrong-agent-id"}' `
    -Headers @{
        "X-Api-Key" = "your-api-key-here"
        "Content-Type" = "application/json"
    }

# Verify agentId is correct (not "wrong-agent-id")
Write-Host "Agent ID: $($response.agentId)"
```

### Test 3: Register without API Key (should fail)

```powershell
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5046/api/callback/register-service" `
        -Method Post `
        -Body '{"name":"TestService3","description":"Test","port":8082,"status":"Running"}' `
        -ContentType "application/json"
} catch {
    Write-Host "Expected error: $($_.Exception.Message)"
    # Should return: "API Key is missing"
}
```

---

## Logging Output

When a service is registered, you'll see logs like:

```
info: VolatixServer.Api.Controllers.CallbackController[0]
      Service registration request received
info: VolatixServer.Api.Controllers.CallbackController[0]
      Registering service 'UserService' for agent 'Production Agent' (ID: abc-123-def-456)
info: VolatixServer.Api.Controllers.CallbackController[0]
      Service 'UserService' registered successfully with ID: xyz-789-uvw-012
```

This makes it easy to see which agent registered which service.

---

## Error Scenarios

### 1. Missing API Key

**Request:** No `X-Api-Key` header

**Response (401 Unauthorized):**

```json
{
  "message": "API Key is missing"
}
```

### 2. Invalid API Key

**Request:** Invalid `X-Api-Key` header

**Response (401 Unauthorized):**

```json
{
  "message": "Invalid API Key"
}
```

### 3. Inactive API Key

**Request:** API Key exists but `isApiKeyActive = false`

**Response (401 Unauthorized):**

```json
{
  "message": "Invalid API Key"
}
```

### 4. Agent not in HttpContext (should never happen)

**Request:** Valid API Key but agent not stored in context

**Response (400 Bad Request):**

```json
{
  "message": "Agent information is missing"
}
```

---

## Summary

✅ Updated `ApiKeyValidationMiddleware` to store authenticated agent in `HttpContext.Items`
✅ Updated `CallbackController.RegisterService` to automatically extract agent ID
✅ Enhanced security by preventing agent ID spoofing
✅ Simplified API - clients no longer need to provide `agentId`
✅ Added detailed logging for better observability
✅ Backward compatible - existing requests with `agentId` still work (value is overridden)
✅ No database schema changes required
✅ No breaking changes to response format

The service registration process is now more secure and easier to use!

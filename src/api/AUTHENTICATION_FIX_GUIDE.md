# Manual Authentication and Agent Creation Test

## Why Data Isn't Persisting

The issue is that the **AgentsController requires authentication** (`[Authorize]` attribute), but you might not be including the JWT token in your requests.

## Step-by-Step Solution

### Step 1: Get Authentication Token

1. Open your browser and go to: `http://localhost:5046/swagger/index.html`
2. Find the **Auth** section and click on **POST /api/auth/login**
3. Click "Try it out"
4. Use this request body:

```json
{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

5. Click "Execute"
6. **Copy the token** from the response (it should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 2: Authorize in Swagger

1. In Swagger UI, click the **"Authorize"** button (top right, has a lock icon)
2. In the "Value" field, enter: `Bearer YOUR_TOKEN_HERE` (replace YOUR_TOKEN_HERE with the actual token)
3. Click "Authorize" then "Close"

### Step 3: Create an Agent

1. Find **POST /api/agents** in the Agents section
2. Click "Try it out"
3. Use this request body:

```json
{
  "name": "Test Agent 001",
  "status": "Active"
}
```

4. Click "Execute"
5. You should see a **201 Created** response with agent details

### Step 4: Verify Agent Creation

1. Find **GET /api/agents** in the Agents section
2. Click "Try it out" then "Execute"
3. You should see your created agent in the response list

## Alternative: PowerShell Test (If Swagger doesn't work)

Run these commands in PowerShell:

```powershell
# 1. Get token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/auth/login" -Method Post -Body '{"email":"test@example.com","password":"TestPassword123!"}' -ContentType "application/json"
$token = $loginResponse.token

# 2. Create agent
$agentResponse = Invoke-RestMethod -Uri "http://localhost:5046/api/agents" -Method Post -Body '{"name":"PowerShell Test Agent","status":"Active"}' -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"}

# 3. Show result
$agentResponse

# 4. Get all agents to verify
Invoke-RestMethod -Uri "http://localhost:5046/api/agents" -Method Get -Headers @{"Authorization"="Bearer $token"}
```

## Expected Results

- **Login**: Should return a JWT token
- **Agent Creation**: Should return agent details with ID, name, status, apiKey, and timestamps
- **Agent List**: Should show your newly created agent(s)

## Troubleshooting

If you still don't see data:

1. **Check Authentication**: Ensure you're using the Bearer token correctly
2. **Check Response Codes**:
   - 401 = Authentication failed
   - 400 = Bad request (check JSON format)
   - 201 = Success
3. **Check Application Logs**: Look at the console where `dotnet run` is running for any errors
4. **Verify Database**: The agent should appear in Cosmos DB under the "Agents" container

## The Root Cause

The `[Authorize]` attribute on AgentsController means:

- All endpoints require valid JWT authentication
- Without authentication, requests are rejected at the middleware level
- No data reaches the repository, so nothing gets saved

This is why your agents weren't persisting - they were never being processed due to authentication failures.

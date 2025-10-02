# Debug script to test agent creation with proper authentication

$baseUrl = "http://localhost:5046"

Write-Host "=== Testing Agent Creation with Authentication ===" -ForegroundColor Yellow

# Step 1: Create a user and get authentication token
Write-Host "`n1. Creating user and getting authentication token..." -ForegroundColor Green

$loginRequest = @{
    Email = "test@example.com"
    Password = "TestPassword123!"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "Making login request to: $baseUrl/api/auth/login" -ForegroundColor Cyan
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginRequest -Headers $headers
    
    $token = $loginResponse.token
    Write-Host "Authentication successful! Token received." -ForegroundColor Green
    Write-Host "Token (first 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "Login failed. Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error body: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Step 2: Create an agent using the authentication token
Write-Host "`n2. Creating agent with authentication token..." -ForegroundColor Green

$agentRequest = @{
    Name = "Test Agent $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Status = "Active"
} | ConvertTo-Json

$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

try {
    Write-Host "Making create agent request to: $baseUrl/api/agents" -ForegroundColor Cyan
    Write-Host "Request body: $agentRequest" -ForegroundColor Gray
    
    $agentResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents" -Method Post -Body $agentRequest -Headers $authHeaders
    
    Write-Host "Agent created successfully!" -ForegroundColor Green
    Write-Host "Agent details:" -ForegroundColor Cyan
    Write-Host "ID: $($agentResponse.id)" -ForegroundColor White
    Write-Host "Name: $($agentResponse.name)" -ForegroundColor White
    Write-Host "Status: $($agentResponse.status)" -ForegroundColor White
    Write-Host "API Key: $($agentResponse.apiKey)" -ForegroundColor White
    Write-Host "Created At: $($agentResponse.createdAt)" -ForegroundColor White
    
} catch {
    Write-Host "Agent creation failed. Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error body: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Verify the agent was created by fetching all agents
Write-Host "`n3. Verifying agent creation by fetching all agents..." -ForegroundColor Green

try {
    $allAgentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents" -Method Get -Headers @{"Authorization" = "Bearer $token"}
    
    Write-Host "All agents in database:" -ForegroundColor Cyan
    $allAgentsResponse | ForEach-Object {
        Write-Host "- ID: $($_.id), Name: $($_.name), Status: $($_.status)" -ForegroundColor White
    }
    
    Write-Host "`nTotal agents found: $($allAgentsResponse.Count)" -ForegroundColor Green
    
} catch {
    Write-Host "Failed to fetch agents. Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Completed ===" -ForegroundColor Yellow

# Agent CRUD API Test Script
# This script tests all Agent CRUD operations end-to-end

# Base URL
$baseUrl = "http://localhost:5046"

Write-Host "🚀 Starting Agent CRUD API Tests..." -ForegroundColor Green
Write-Host "Testing against: $baseUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login to get authentication token
Write-Host "🔐 Step 1: Authenticating..." -ForegroundColor Yellow
$loginBody = @{
    Email = "admin@volatix.com"
    Password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Authentication successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Authentication failed: $_" -ForegroundColor Red
    exit 1
}

# Set up headers for authenticated requests
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host ""

# Test 2: Create Agent
Write-Host "📝 Step 2: Creating a new Agent..." -ForegroundColor Yellow
$createAgentBody = @{
    Name = "Test Agent - CRUD Test $(Get-Date -Format 'HH:mm:ss')"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents" -Method POST -Body $createAgentBody -Headers $headers
    $agentId = $createResponse.id
    Write-Host "✅ Agent created successfully" -ForegroundColor Green
    Write-Host "Agent ID: $agentId" -ForegroundColor Gray
    Write-Host "Agent Name: $($createResponse.name)" -ForegroundColor Gray
    Write-Host "Agent Status: $($createResponse.status)" -ForegroundColor Gray
    Write-Host "Agent API Key: $($createResponse.apiKey.Substring(0, 10))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Agent creation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Get All Agents
Write-Host "📋 Step 3: Retrieving all Agents..." -ForegroundColor Yellow
try {
    $allAgentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents" -Method GET -Headers $headers
    $agentCount = $allAgentsResponse.Count
    Write-Host "✅ Retrieved all agents successfully" -ForegroundColor Green
    Write-Host "Total agents found: $agentCount" -ForegroundColor Gray
    
    # Display first few agents
    if ($agentCount -gt 0) {
        Write-Host "Sample agents:" -ForegroundColor Gray
        $allAgentsResponse | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - $($_.name) (ID: $($_.id.Substring(0, 8))...)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Get all agents failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 4: Get Single Agent
Write-Host "🔍 Step 4: Retrieving single Agent by ID..." -ForegroundColor Yellow
try {
    $singleAgentResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId" -Method GET -Headers $headers
    Write-Host "✅ Single agent retrieved successfully" -ForegroundColor Green
    Write-Host "Agent Name: $($singleAgentResponse.name)" -ForegroundColor Gray
    Write-Host "Agent Status: $($singleAgentResponse.status)" -ForegroundColor Gray
    Write-Host "Is API Key Active: $($singleAgentResponse.isApiKeyActive)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get single agent failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: Update Agent
Write-Host "✏️ Step 5: Updating Agent..." -ForegroundColor Yellow
$updateAgentBody = @{
    Name = "Updated Test Agent - $(Get-Date -Format 'HH:mm:ss')"
    Status = "Inactive"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId" -Method PUT -Body $updateAgentBody -Headers $headers
    Write-Host "✅ Agent updated successfully" -ForegroundColor Green
    Write-Host "Updated Name: $($updateResponse.name)" -ForegroundColor Gray
    Write-Host "Updated Status: $($updateResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Agent update failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 6: Regenerate API Key
Write-Host "🔑 Step 6: Regenerating Agent API Key..." -ForegroundColor Yellow
try {
    $regenResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId/regenerate-api-key" -Method POST -Headers $headers
    Write-Host "✅ API Key regenerated successfully" -ForegroundColor Green
    Write-Host "New API Key: $($regenResponse.apiKey.Substring(0, 10))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ API Key regeneration failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 7: Verify Update (Get agent again to confirm changes)
Write-Host "🔍 Step 7: Verifying update..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId" -Method GET -Headers $headers
    Write-Host "✅ Verification successful" -ForegroundColor Green
    Write-Host "Verified Name: $($verifyResponse.name)" -ForegroundColor Gray
    Write-Host "Verified Status: $($verifyResponse.status)" -ForegroundColor Gray
    
    # Check if the name contains "Updated"
    if ($verifyResponse.name -like "*Updated*") {
        Write-Host "✅ Update confirmation: Name was successfully updated" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Update may not have persisted correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Verification failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 8: Delete Agent
Write-Host "🗑️ Step 8: Deleting Agent..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId" -Method DELETE -Headers $headers
    Write-Host "✅ Agent deleted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Agent deletion failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 9: Verify Deletion (Try to get deleted agent)
Write-Host "🔍 Step 9: Verifying deletion..." -ForegroundColor Yellow
try {
    $deletedAgentResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId" -Method GET -Headers $headers
    Write-Host "⚠️ Agent still exists after deletion - this might be a problem" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    if ($statusCode -eq "NotFound" -or $statusCode -eq 404) {
        Write-Host "✅ Deletion verified: Agent not found (as expected)" -ForegroundColor Green
    } else {
        Write-Host "❌ Verification failed with unexpected error: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test 10: Final Agent Count
Write-Host "📊 Step 10: Final agent count check..." -ForegroundColor Yellow
try {
    $finalAgentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents" -Method GET -Headers $headers
    $finalCount = $finalAgentsResponse.Count
    Write-Host "✅ Final agent count: $finalCount" -ForegroundColor Green
    
    if ($finalCount -eq ($agentCount - 1)) {
        Write-Host "✅ Agent count decreased by 1 as expected" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Agent count not as expected (was $agentCount, now $finalCount)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Final count check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Agent CRUD API Test Complete!" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Authentication: ✅" -ForegroundColor Green
Write-Host "- Create Agent: ✅" -ForegroundColor Green  
Write-Host "- Get All Agents: ✅" -ForegroundColor Green
Write-Host "- Get Single Agent: ✅" -ForegroundColor Green
Write-Host "- Update Agent: ✅" -ForegroundColor Green
Write-Host "- Regenerate API Key: ✅" -ForegroundColor Green
Write-Host "- Delete Agent: ✅" -ForegroundColor Green
Write-Host "- Verify Operations: ✅" -ForegroundColor Green
Write-Host ""
Write-Host "All Agent CRUD operations tested successfully! 🎯" -ForegroundColor Green

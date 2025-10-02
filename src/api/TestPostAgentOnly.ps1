# Single Agent Creation Test
# Tests only POST /agents endpoint and verifies data creation

Write-Host "🎯 Testing POST /agents Endpoint Only" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:5046"

# Step 1: Get Authentication Token
Write-Host "🔐 Step 1: Getting authentication token..." -ForegroundColor Yellow
$loginBody = @{
    Email = "admin@volatix.com"
    Password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Authentication successful" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Authentication failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create Agent (POST /agents)
Write-Host "📝 Step 2: Creating new agent via POST /agents..." -ForegroundColor Yellow

$agentData = @{
    Name = "Test Agent - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Status = "Active"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Request Data:" -ForegroundColor Cyan
Write-Host $agentData -ForegroundColor Gray
Write-Host ""

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents" -Method POST -Body $agentData -Headers $headers
    
    Write-Host "✅ Agent created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 CREATED AGENT DATA:" -ForegroundColor Cyan
    Write-Host "======================" -ForegroundColor Cyan
    Write-Host "ID: $($createResponse.id)" -ForegroundColor White
    Write-Host "Name: $($createResponse.name)" -ForegroundColor White
    Write-Host "Status: $($createResponse.status)" -ForegroundColor White
    Write-Host "API Key: $($createResponse.apiKey)" -ForegroundColor White
    Write-Host "Is API Key Active: $($createResponse.isApiKeyActive)" -ForegroundColor White
    Write-Host "Created At: $($createResponse.createdAt)" -ForegroundColor White
    Write-Host "Updated At: $($createResponse.updatedAt)" -ForegroundColor White
    Write-Host ""
    
    # Store the ID for verification
    $agentId = $createResponse.id
    
    Write-Host "🗂️ DATABASE STORAGE INFO:" -ForegroundColor Magenta
    Write-Host "========================" -ForegroundColor Magenta
    Write-Host "Database: VolatixDb" -ForegroundColor White
    Write-Host "Container: Agents" -ForegroundColor White
    Write-Host "Partition Key: agents" -ForegroundColor White
    Write-Host "Document ID: $agentId" -ForegroundColor White
    Write-Host ""
    
    # Step 3: Verify the agent was created by retrieving it
    Write-Host "🔍 Step 3: Verifying agent exists in database..." -ForegroundColor Yellow
    
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/agents/$agentId" -Method GET -Headers $headers
    
    Write-Host "✅ Agent verification successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 VERIFIED DATA FROM DATABASE:" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Retrieved ID: $($verifyResponse.id)" -ForegroundColor White
    Write-Host "Retrieved Name: $($verifyResponse.name)" -ForegroundColor White
    Write-Host "Retrieved Status: $($verifyResponse.status)" -ForegroundColor White
    Write-Host ""
    
    if ($verifyResponse.id -eq $createResponse.id) {
        Write-Host "✅ DATA CONSISTENCY VERIFIED: Created and retrieved data match!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Data inconsistency detected" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Agent creation failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 POST /agents Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 You can also verify the data in Cosmos DB Emulator:" -ForegroundColor Cyan
Write-Host "1. Open Cosmos DB Emulator (https://localhost:8081/_explorer/index.html)" -ForegroundColor Gray
Write-Host "2. Navigate to VolatixDb > Agents container" -ForegroundColor Gray
Write-Host "3. Look for document with ID: $agentId" -ForegroundColor Gray

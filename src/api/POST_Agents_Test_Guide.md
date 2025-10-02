# 🎯 POST /agents Endpoint Test Guide

## Testing ONLY the Agent Creation Endpoint

Since the Swagger UI is now open at http://localhost:5046/swagger/index.html, follow these steps to test ONLY the POST /agents endpoint:

### Step 1: Authenticate 🔐

1. **Scroll down to the "Auth" section** in the Swagger UI
2. **Click on "POST /api/auth/login"**
3. **Click "Try it out"**
4. **Replace the request body** with:

```json
{
  "email": "admin@volatix.com",
  "password": "admin123"
}
```

5. **Click "Execute"**
6. **Copy the token** from the response (it will be a long JWT string)

### Step 2: Authorize All Requests 🔑

1. **Click the "Authorize" button** at the top right of the Swagger UI
2. **In the "Value" field**, enter: `Bearer YOUR_TOKEN_HERE`
   - Replace `YOUR_TOKEN_HERE` with the actual token you copied
3. **Click "Authorize"**
4. **Click "Close"**

### Step 3: Test POST /agents Endpoint 📝

1. **Scroll down to the "Agents" section** in the Swagger UI
2. **Click on "POST /api/agents"** (the first one in the Agents section)
3. **Click "Try it out"**
4. **Replace the request body** with:

```json
{
  "name": "Test Agent - Manual Creation",
  "status": "Active"
}
```

5. **Click "Execute"**

### Step 4: Verify the Response 📊

You should see a **201 Created** status with a response like:

```json
{
  "id": "some-guid-here",
  "name": "Test Agent - Manual Creation",
  "status": "Active",
  "apiKey": "some-api-key-here",
  "isApiKeyActive": true,
  "createdAt": "2025-10-02T...",
  "updatedAt": "2025-10-02T..."
}
```

### Step 5: Database Verification 🗂️

The agent data will be stored in:

- **Database**: VolatixDb
- **Container**: Agents
- **Partition Key**: "agents"
- **Document ID**: The ID returned in the response

### Step 6: Optional - Verify in Cosmos DB Emulator 🔍

1. Open **Cosmos DB Emulator** at: https://localhost:8081/\_explorer/index.html
2. Navigate to **VolatixDb** > **Agents** container
3. Look for the document with the ID from your response
4. You should see the agent data stored exactly as created

## Expected Results ✅

- **HTTP Status**: 201 Created
- **Response**: Complete agent object with auto-generated ID and API key
- **Database Storage**: Agent stored in dedicated "Agents" container
- **Container Isolation**: No mixing with Users, Services, or Cache data
- **Security**: API key automatically generated and activated

## Data Flow Verification 🔄

```
POST /api/agents
→ AgentsController.CreateAgent()
→ AgentService.CreateAgentAsync()
→ CosmosRepository<Agent> (via ContainerMappingService)
→ Agents Container in VolatixDb
→ Partition: "agents"
```

## What You'll See in the Database 💾

```json
{
  "id": "generated-guid",
  "name": "Test Agent - Manual Creation",
  "status": "Active",
  "apiKey": "generated-api-key",
  "isApiKeyActive": true,
  "partitionKey": "agents",
  "createdAt": "2025-10-02T...",
  "updatedAt": "2025-10-02T...",
  "version": "1.0"
}
```

This test will show you that:

1. ✅ The API endpoint works correctly
2. ✅ Authentication is properly implemented
3. ✅ Data is stored in the correct Cosmos DB container
4. ✅ Container isolation is working (Agents go to "Agents" container)
5. ✅ All required fields are populated automatically
6. ✅ The multi-container architecture is functioning properly

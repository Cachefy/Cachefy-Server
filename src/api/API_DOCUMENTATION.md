# Volatix Server API Documentation

## Base URL

```
http://localhost:5046/api
```

## Authentication

All endpoints (except `/auth/login` and `/auth/register`) require JWT Bearer token authentication.

### Get Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@volatix.com",
  "password": "admin123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@volatix.com"
}
```

Use the token in subsequent requests:

```
Authorization: Bearer {token}
```

---

## Agents Endpoints

### Get All Agents

```http
GET /agents
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Agent 1",
    "url": "http://agent1.example.com",
    "apiKey": "ak_1234567890abcdef",
    "isApiKeyActive": true,
    "createdAt": "2025-10-02T10:00:00Z",
    "updatedAt": "2025-10-02T10:00:00Z"
  }
]
```

### Get Agent by ID

```http
GET /agents/{id}
Authorization: Bearer {token}
```

### Create Agent

```http
POST /agents
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Agent",
  "url": "http://newagent.example.com"
}
```

**Response:** `201 Created`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "New Agent",
  "url": "http://newagent.example.com",
  "apiKey": "ak_generated_api_key",
  "isApiKeyActive": true,
  "createdAt": "2025-10-02T10:00:00Z",
  "updatedAt": "2025-10-02T10:00:00Z"
}
```

### Update Agent

```http
PUT /agents/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Agent Name",
  "url": "http://updated-url.example.com"
}
```

**Response:** `200 OK`

### Delete Agent

```http
DELETE /agents/{id}
Authorization: Bearer {token}
```

**Response:** `204 No Content`

### Regenerate Agent API Key

```http
POST /agents/{id}/regenerate-api-key
Authorization: Bearer {token}
```

**Response:**

```json
{
  "apiKey": "ak_new_generated_key"
}
```

---

## Services Endpoints

### Get All Services

```http
GET /services
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "API Service",
    "description": "Main API service",
    "port": 8080,
    "status": "Running",
    "createdAt": "2025-10-02T10:00:00Z",
    "updatedAt": "2025-10-02T10:00:00Z"
  }
]
```

### Get Service by ID

```http
GET /services/{id}
Authorization: Bearer {token}
```

### Create Service

```http
POST /services
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Service",
  "description": "Service description",
  "port": 9000,
  "status": "Running"
}
```

**Response:** `201 Created`

### Update Service

```http
PUT /services/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Service",
  "description": "Updated description",
  "port": 9001,
  "status": "Stopped"
}
```

**Response:** `200 OK`

### Delete Service

```http
DELETE /services/{id}
Authorization: Bearer {token}
```

**Response:** `204 No Content`

---

## Caches Endpoints

### Get All Caches

```http
GET /caches
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Redis Cache",
    "size": "2GB",
    "type": "Redis",
    "status": "Active",
    "createdAt": "2025-10-02T10:00:00Z",
    "updatedAt": "2025-10-02T10:00:00Z"
  }
]
```

### Get Cache by ID

```http
GET /caches/{id}
Authorization: Bearer {token}
```

### Create Cache

```http
POST /caches
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Cache",
  "size": "4GB",
  "type": "Redis",
  "status": "Active"
}
```

**Response:** `201 Created`

### Update Cache

```http
PUT /caches/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Cache",
  "size": "8GB",
  "type": "Redis",
  "status": "Inactive"
}
```

**Response:** `200 OK`

### Delete Cache

```http
DELETE /caches/{id}
Authorization: Bearer {token}
```

**Response:** `204 No Content`

---

## Error Responses

### 400 Bad Request

```json
{
  "errors": {
    "Name": ["The Name field is required."]
  }
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "message": "Agent with ID {id} not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "An error occurred while processing your request"
}
```

---

## CORS Configuration

The API allows requests from:

- `http://localhost:4200`
- `http://localhost:4201`
- `http://localhost:4202`

All methods and headers are allowed, and credentials are supported.

---

## Database Structure

### Cosmos DB Configuration

- **Database:** VolatixDb
- **Containers:**
  - Agents (partition key: "agents")
  - Services (partition key: "services")
  - Caches (partition key: "caches")
  - Users (partition key: "users")
  - Items (partition key: "items")

### Base Entity Properties

All entities inherit from `BaseEntity`:

```json
{
  "id": "string (GUID)",
  "partitionKey": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "version": "string (default: 1.0)"
}
```

---

## Testing with Swagger

Access Swagger UI at: `http://localhost:5046/swagger/index.html`

1. Click **Authorize** button
2. Enter: `Bearer {your-token}`
3. Test all endpoints interactively

---

## Angular Integration Example

```typescript
// auth.service.ts
export class AuthService {
  private baseUrl = "http://localhost:5046/api";

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, {
      email,
      password,
    });
  }
}

// agent.service.ts
export class AgentService {
  private baseUrl = "http://localhost:5046/api/agents";

  getAll(): Observable<AgentResponse[]> {
    return this.http.get<AgentResponse[]>(this.baseUrl);
  }

  create(agent: CreateAgentDto): Observable<AgentResponse> {
    return this.http.post<AgentResponse>(this.baseUrl, agent);
  }

  update(id: string, agent: UpdateAgentDto): Observable<AgentResponse> {
    return this.http.put<AgentResponse>(`${this.baseUrl}/${id}`, agent);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

---

## Notes

- All timestamps are in UTC
- IDs are generated automatically (GUID format)
- Partition keys are set automatically based on entity type
- API Keys for agents are generated automatically on creation
- JWT tokens expire based on configuration (default: 24 hours)

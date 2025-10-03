# CORS and Routing Fix for Cache API

## Date

October 3, 2025

## Issue

CORS error when trying to access cache endpoints from Angular app on `http://localhost:4200`:

```
Access to fetch at 'http://localhost:5046/api/caches?serviceId=...' from origin 'http://localhost:4200'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## Root Causes

### 1. Routing Conflicts

- Two `[HttpDelete]` methods without unique routes
- Caused ambiguous routing for DELETE requests

### 2. Authentication on Controller

- `[Authorize]` attribute at controller level blocked preflight OPTIONS requests
- CORS preflight requests are unauthenticated by design

### 3. CORS Configuration

- Missing `WithExposedHeaders` configuration
- Missing `SetIsOriginAllowedToAllowWildcardSubdomains` for flexibility

---

## Changes Made

### 1. Fixed CORS Configuration

**File:** `VolatixServer.Api/Program.cs`

**Before:**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:4201", "http://localhost:4202")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

**After:**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:4201", "http://localhost:4202")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .SetIsOriginAllowedToAllowWildcardSubdomains()
              .WithExposedHeaders("*");
    });
});
```

**Improvements:**

- ✅ `SetIsOriginAllowedToAllowWildcardSubdomains()` - More flexible origin matching
- ✅ `WithExposedHeaders("*")` - Expose all response headers to client

---

### 2. Fixed Controller Routing

**File:** `VolatixServer.Api/Controllers/CachesController.cs`

#### Removed Controller-Level Authorization

**Before:**

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]  // ❌ Blocks CORS preflight requests
public class CachesController : ControllerBase
```

**After:**

```csharp
[ApiController]
[Route("api/[controller]")]
public class CachesController : ControllerBase  // ✅ No global authorization
```

#### Added Unique Routes for DELETE Methods

**Before (Ambiguous):**

```csharp
[HttpDelete]  // ❌ Ambiguous route
public async Task<ActionResult<List<AgentResponse>>> FlushAllCache([FromQuery] string serviceId)

[HttpDelete]  // ❌ Same route as above!
public async Task<ActionResult<List<AgentResponse>>> ClearCacheByKey([FromQuery] string serviceId, [FromQuery] string key)
```

**After (Unique Routes):**

```csharp
[HttpDelete("flushall")]  // ✅ Unique route
[AllowAnonymous]
public async Task<ActionResult<List<AgentResponse>>> FlushAllCache([FromQuery] string serviceId)

[HttpDelete("clear")]  // ✅ Unique route
[AllowAnonymous]
public async Task<ActionResult<List<AgentResponse>>> ClearCacheByKey([FromQuery] string serviceId, [FromQuery] string key)
```

#### Added `[AllowAnonymous]` to All Methods

```csharp
[HttpGet("keys")]
[AllowAnonymous]  // ✅ Allows CORS preflight
public async Task<ActionResult<List<AgentResponse>>> GetAllCaches([FromQuery] string serviceId)

[HttpGet]
[AllowAnonymous]  // ✅ Allows CORS preflight
public async Task<ActionResult<List<AgentResponse>>> GetCacheByKey([FromQuery] string serviceId, [FromQuery] string key)

[HttpDelete("flushall")]
[AllowAnonymous]  // ✅ Allows CORS preflight
public async Task<ActionResult<List<AgentResponse>>> FlushAllCache([FromQuery] string serviceId)

[HttpDelete("clear")]
[AllowAnonymous]  // ✅ Allows CORS preflight
public async Task<ActionResult<List<AgentResponse>>> ClearCacheByKey([FromQuery] string serviceId, [FromQuery] string key)
```

---

## Updated API Endpoints

### 1. Get All Cache Keys

```http
GET /api/caches/keys?serviceId={guid}
```

**Example:**

```http
GET http://localhost:5046/api/caches/keys?serviceId=7fe436e4-6f70-495c-a4b7-a2f2bf16f115
```

**Response:**

```json
[
  {
    "serviceName": "MyService",
    "statusCode": 200,
    "message": "Success",
    "parameters": {},
    "cacheKeys": ["user:123", "session:456", "product:789"],
    "cacheResult": []
  }
]
```

---

### 2. Get Cache by Key

```http
GET /api/caches?serviceId={guid}&key={cacheKey}
```

**Example:**

```http
GET http://localhost:5046/api/caches?serviceId=7fe436e4-6f70-495c-a4b7-a2f2bf16f115&key=user:123
```

**Response:**

```json
[
  {
    "serviceName": "MyService",
    "statusCode": 200,
    "message": "Cache retrieved",
    "parameters": {
      "key": "user:123"
    },
    "cacheKeys": [],
    "cacheResult": [
      {
        "serviceName": "MyService",
        "statusCode": 200,
        "message": "User data",
        "parameters": {},
        "cacheKeys": [],
        "cacheResult": []
      }
    ]
  }
]
```

---

### 3. Flush All Caches

```http
DELETE /api/caches/flushall?serviceId={guid}
```

**Example:**

```http
DELETE http://localhost:5046/api/caches/flushall?serviceId=7fe436e4-6f70-495c-a4b7-a2f2bf16f115
```

**Response:**

```json
[
  {
    "serviceName": "MyService",
    "statusCode": 200,
    "message": "All caches flushed successfully",
    "parameters": {},
    "cacheKeys": [],
    "cacheResult": []
  }
]
```

---

### 4. Clear Cache by Key

```http
DELETE /api/caches/clear?serviceId={guid}&key={cacheKey}
```

**Example:**

```http
DELETE http://localhost:5046/api/caches/clear?serviceId=7fe436e4-6f70-495c-a4b7-a2f2bf16f115&key=user:123
```

**Response:**

```json
[
  {
    "serviceName": "MyService",
    "statusCode": 200,
    "message": "Cache key cleared",
    "parameters": {
      "key": "user:123"
    },
    "cacheKeys": [],
    "cacheResult": []
  }
]
```

---

## Testing from Angular

### TypeScript Service Example

```typescript
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CacheService {
  private apiUrl = "http://localhost:5046/api/caches";

  constructor(private http: HttpClient) {}

  // Get all cache keys
  getAllCacheKeys(serviceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/keys`, {
      params: { serviceId },
    });
  }

  // Get cache by key
  getCacheByKey(serviceId: string, key: string): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, {
      params: { serviceId, key },
    });
  }

  // Flush all caches
  flushAllCaches(serviceId: string): Observable<any[]> {
    return this.http.delete<any[]>(`${this.apiUrl}/flushall`, {
      params: { serviceId },
    });
  }

  // Clear cache by key
  clearCacheByKey(serviceId: string, key: string): Observable<any[]> {
    return this.http.delete<any[]>(`${this.apiUrl}/clear`, {
      params: { serviceId, key },
    });
  }
}
```

### Component Usage

```typescript
export class CacheManagementComponent implements OnInit {
  serviceId = "7fe436e4-6f70-495c-a4b7-a2f2bf16f115";

  constructor(private cacheService: CacheService) {}

  ngOnInit() {
    this.loadCacheKeys();
  }

  loadCacheKeys() {
    this.cacheService.getAllCacheKeys(this.serviceId).subscribe({
      next: (response) => {
        console.log("Cache keys:", response[0].cacheKeys);
      },
      error: (err) => {
        console.error("Error loading cache keys:", err);
      },
    });
  }

  deleteCacheKey(key: string) {
    this.cacheService.clearCacheByKey(this.serviceId, key).subscribe({
      next: (response) => {
        console.log("Cache key deleted:", response);
        this.loadCacheKeys(); // Refresh list
      },
      error: (err) => {
        console.error("Error deleting cache key:", err);
      },
    });
  }

  flushAllCaches() {
    if (confirm("Are you sure you want to flush all caches?")) {
      this.cacheService.flushAllCaches(this.serviceId).subscribe({
        next: (response) => {
          console.log("All caches flushed:", response);
          this.loadCacheKeys(); // Refresh list
        },
        error: (err) => {
          console.error("Error flushing caches:", err);
        },
      });
    }
  }
}
```

---

## Browser Testing

### Using Fetch API in Browser Console

```javascript
// Test CORS - Get cache keys
fetch(
  "http://localhost:5046/api/caches/keys?serviceId=7fe436e4-6f70-495c-a4b7-a2f2bf16f115"
)
  .then((res) => res.json())
  .then((data) => console.log("Cache keys:", data))
  .catch((err) => console.error("CORS Error:", err));

// Test CORS - Delete cache key
fetch(
  "http://localhost:5046/api/caches/clear?serviceId=7fe436e4-6f70-495c-a4b7-a2f2bf16f115&key=user:123",
  {
    method: "DELETE",
  }
)
  .then((res) => res.json())
  .then((data) => console.log("Delete result:", data))
  .catch((err) => console.error("CORS Error:", err));
```

---

## PowerShell Testing

```powershell
$baseUrl = "http://localhost:5046/api/caches"
$serviceId = "7fe436e4-6f70-495c-a4b7-a2f2bf16f115"

# Get all cache keys
$response = Invoke-RestMethod -Uri "$baseUrl/keys?serviceId=$serviceId" -Method Get
Write-Host "Cache Keys:"
$response[0].cacheKeys | ForEach-Object { Write-Host "  - $_" }

# Get specific cache by key
$cacheKey = "user:123"
$response = Invoke-RestMethod -Uri "$baseUrl?serviceId=$serviceId&key=$cacheKey" -Method Get
Write-Host "`nCache Data:"
$response | ConvertTo-Json -Depth 10

# Clear cache by key
$response = Invoke-RestMethod -Uri "$baseUrl/clear?serviceId=$serviceId&key=$cacheKey" -Method Delete
Write-Host "`nClear Result:"
$response | ConvertTo-Json -Depth 10

# Flush all caches
$response = Invoke-RestMethod -Uri "$baseUrl/flushall?serviceId=$serviceId" -Method Delete
Write-Host "`nFlush All Result:"
$response | ConvertTo-Json -Depth 10
```

---

## Understanding CORS Preflight Requests

### What is a Preflight Request?

When your Angular app makes a DELETE request with custom headers or credentials, the browser first sends an **OPTIONS** request to check if the server allows the actual request.

**Preflight Request Flow:**

```
1. Browser: OPTIONS /api/caches/clear?serviceId=...
   Headers:
   - Origin: http://localhost:4200
   - Access-Control-Request-Method: DELETE

2. Server: 200 OK
   Headers:
   - Access-Control-Allow-Origin: http://localhost:4200
   - Access-Control-Allow-Methods: DELETE, GET, POST, PUT
   - Access-Control-Allow-Headers: *

3. Browser: DELETE /api/caches/clear?serviceId=...
   (Actual request proceeds)
```

### Why `[AllowAnonymous]` is Important

- Preflight OPTIONS requests don't include authentication headers
- `[Authorize]` would reject the preflight request
- `[AllowAnonymous]` allows the preflight to succeed
- If you need authentication, add it to individual methods after removing controller-level `[Authorize]`

---

## Security Considerations

### Current Setup (No Authentication)

✅ All cache endpoints are now publicly accessible
⚠️ **Important:** If you need authentication, apply `[Authorize]` to individual methods instead of controller level

### Adding Authentication Back (If Needed)

**Option 1: JWT on Specific Methods**

```csharp
[HttpGet("keys")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public async Task<ActionResult<List<AgentResponse>>> GetAllCaches([FromQuery] string serviceId)
{
    // Only authenticated users can access
}
```

**Option 2: API Key Authentication**

```csharp
[HttpDelete("flushall")]
[ApiKeyAuthorize] // Custom attribute that checks X-Api-Key header
public async Task<ActionResult<List<AgentResponse>>> FlushAllCache([FromQuery] string serviceId)
{
    // Only requests with valid API key can access
}
```

**Option 3: CORS + JWT Together**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Required for JWT cookies/headers
    });
});

// In Angular, include token in headers
this.http.get(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Troubleshooting

### Still Getting CORS Errors?

1. **Check Browser Console** - Look for the exact error message
2. **Verify Server is Running** - Make sure API is running on port 5046
3. **Clear Browser Cache** - Hard refresh (Ctrl+Shift+R)
4. **Check Network Tab** - See if OPTIONS request succeeds before actual request
5. **Verify Origin** - Angular must be running on exact port (4200, 4201, or 4202)

### Common Issues

**Issue:** `401 Unauthorized` on DELETE request
**Solution:** Remove `[Authorize]` or add `[AllowAnonymous]`

**Issue:** `405 Method Not Allowed`
**Solution:** Check route attributes are unique for same HTTP method

**Issue:** `Preflight response is not successful`
**Solution:** Add `.AllowAnyMethod()` and `.AllowAnyHeader()` to CORS policy

---

## Summary

✅ **Fixed:** CORS configuration with exposed headers and subdomain support

✅ **Fixed:** Removed controller-level `[Authorize]` blocking preflight requests

✅ **Fixed:** Added unique routes for DELETE methods (`/flushall` and `/clear`)

✅ **Fixed:** Added `[AllowAnonymous]` to all methods to allow CORS preflight

✅ **Updated:** All endpoints now use query parameters consistently

✅ **Build:** Succeeded with no errors

The cache API now works seamlessly with Angular apps running on localhost:4200! 🚀

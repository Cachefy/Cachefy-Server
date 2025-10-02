# Fix CORS Redirect Issue

## Problem

```
Access to fetch at 'http://localhost:5046/api/auth/login' from origin 'http://localhost:4200'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
Redirect is not allowed for a preflight request.
```

## Root Cause

Your .NET API is configured with `app.UseHttpsRedirection()` which redirects HTTP requests to HTTPS.
This causes CORS preflight OPTIONS requests to fail because redirects are not allowed during preflight.

## Solution: Disable HTTPS Redirection in Development

In your .NET API's `Program.cs` file, find and modify the HTTPS redirection:

**BEFORE:**

```csharp
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection(); // <-- This causes the redirect issue
app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

**AFTER:**

```csharp
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Only redirect to HTTPS in production, not in development
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

## Verify CORS Configuration

Ensure your CORS is configured correctly in `Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "http://localhost:4201",
                "http://localhost:4202")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

**Important:** Ensure CORS is placed BEFORE Authentication:

```csharp
app.UseCors("AllowAngularApp");     // <-- First
app.UseAuthentication();             // <-- Then auth
app.UseAuthorization();
```

## Quick Fix Steps

1. In your .NET API, open `Program.cs`
2. Wrap `app.UseHttpsRedirection()` with an environment check:
   ```csharp
   if (!app.Environment.IsDevelopment())
   {
       app.UseHttpsRedirection();
   }
   ```
3. Save the file
4. **Restart your .NET API**
5. Refresh your Angular app

## Test the Fix

```powershell
# Test CORS preflight
curl.exe -X OPTIONS http://localhost:5046/api/auth/login `
  -H "Origin: http://localhost:4200" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type" `
  -v
```

You should see these headers in the response:

- `Access-Control-Allow-Origin: http://localhost:4200`
- `Access-Control-Allow-Methods: POST`
- `Access-Control-Allow-Headers: content-type`

## Alternative: Use HTTPS Everywhere

If you prefer to use HTTPS:

1. Update Angular environment.ts:

   ```typescript
   apiUrl: 'https://localhost:7283/api';
   ```

2. Trust the development certificate:

   ```powershell
   dotnet dev-certs https --trust
   ```

3. Restart browser completely

4. Update CORS to allow HTTPS origins:
   ```csharp
   policy.WithOrigins(
       "http://localhost:4200",
       "https://localhost:4200" // Add HTTPS version
   )
   ```

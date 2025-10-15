using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Azure.Cosmos;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Cachefy.Api.Middleware;
using Cachefy.Infrastructure.Configuration;
using Cachefy.Infrastructure.Repositories;
using Cachefy.Infrastructure.Services;
using Cachefy.Service.Services;
using UserModel = Cachefy.Infrastructure.Models.User;
using AgentModel = Cachefy.Infrastructure.Models.Agent;
using ServiceModel = Cachefy.Infrastructure.Models.Service;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.Configure<CosmosDbSettings>(
    builder.Configuration.GetSection("CosmosDb"));
builder.Services.Configure<CorsSettings>(
    builder.Configuration.GetSection("Cors"));

// Cosmos DB Client
builder.Services.AddSingleton<CosmosClient>(sp =>
{
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    return new CosmosClient(cosmosSettings.ConnectionString);
});

// Container Mapping Service
builder.Services.AddSingleton<IContainerMappingService, ContainerMappingService>();

// Repositories
builder.Services.AddScoped<IRepository<UserModel>>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    var containerMappingService = sp.GetRequiredService<IContainerMappingService>();
    return new CosmosRepository<UserModel>(cosmosClient, cosmosSettings.DatabaseName, containerMappingService);
});

builder.Services.AddScoped<IRepository<AgentModel>>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    var containerMappingService = sp.GetRequiredService<IContainerMappingService>();
    return new CosmosRepository<AgentModel>(cosmosClient, cosmosSettings.DatabaseName, containerMappingService);
});

builder.Services.AddScoped<IRepository<ServiceModel>>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    var containerMappingService = sp.GetRequiredService<IContainerMappingService>();
    return new CosmosRepository<ServiceModel>(cosmosClient, cosmosSettings.DatabaseName, containerMappingService);
});

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAgentService, AgentService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<ICacheService, CacheService>();

// Cosmos DB Initialization Service
builder.Services.AddScoped<ICosmosDbInitializationService>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    var containerMappingService = sp.GetRequiredService<IContainerMappingService>();
    return new CosmosDbInitializationService(cosmosClient, cosmosSettings, containerMappingService);
});

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Issuer"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!))
        };
    });

builder.Services.AddAuthorization();

// Add HttpClient factory for external API calls
builder.Services.AddHttpClient();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS - Dynamic Configuration
builder.Services.AddCors(options =>
{
    var corsSettings = builder.Configuration.GetSection("Cors").Get<CorsSettings>()!;
    
    options.AddPolicy(corsSettings.PolicyName, policy =>
    {
        // Configure origins
        if (corsSettings.AllowedOrigins.Length > 0)
        {
            policy.WithOrigins(corsSettings.AllowedOrigins);
        }
        else
        {
            policy.AllowAnyOrigin();
        }

        // Configure methods
        if (corsSettings.AllowAnyMethod)
        {
            policy.AllowAnyMethod();
        }

        // Configure headers
        if (corsSettings.AllowAnyHeader)
        {
            policy.AllowAnyHeader();
        }

        // Configure credentials
        if (corsSettings.AllowCredentials)
        {
            policy.AllowCredentials();
        }

        // Configure wildcard subdomains
        if (corsSettings.AllowWildcardSubdomains)
        {
            policy.SetIsOriginAllowedToAllowWildcardSubdomains();
        }

        // Configure exposed headers
        if (corsSettings.ExposeAllHeaders)
        {
            policy.WithExposedHeaders("*");
        }
        else if (corsSettings.ExposedHeaders.Length > 0)
        {
            policy.WithExposedHeaders(corsSettings.ExposedHeaders);
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS must be placed before authentication and authorization
var corsSettings = app.Configuration.GetSection("Cors").Get<CorsSettings>()!;
app.UseCors(corsSettings.PolicyName);

// API Key validation middleware (must be before authentication)
app.UseApiKeyValidation();

// Comment out HTTPS redirection in development to avoid CORS preflight issues
// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Initialize Cosmos DB (create database and container if they don't exist)
using (var scope = app.Services.CreateScope())
{
    var cosmosInitService = scope.ServiceProvider.GetRequiredService<ICosmosDbInitializationService>();
    await cosmosInitService.InitializeAsync();
}

// Seed default userls
using (var scope = app.Services.CreateScope())
{
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    try
    {
        await authService.CreateUserAsync("admin@volatix.com", "admin123", "Admin");
        Console.WriteLine("Default admin user created successfully.");
    }
    catch (InvalidOperationException ex)
    {
        Console.WriteLine($"User creation skipped: {ex.Message}");
    }
}

app.Run();

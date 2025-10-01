using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Azure.Cosmos;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using VolatixServer.Infrastructure.Configuration;
using VolatixServer.Infrastructure.Repositories;
using VolatixServer.Service.Services;
using UserModel = VolatixServer.Infrastructure.Models.User;
using AgentModel = VolatixServer.Infrastructure.Models.Agent;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.Configure<CosmosDbSettings>(
    builder.Configuration.GetSection("CosmosDb"));

// Cosmos DB Client
builder.Services.AddSingleton<CosmosClient>(sp =>
{
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    return new CosmosClient(cosmosSettings.ConnectionString);
});

// Repositories
builder.Services.AddScoped<IRepository<UserModel>>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    return new CosmosRepository<UserModel>(cosmosClient, cosmosSettings.DatabaseName, cosmosSettings.ContainerName);
});

builder.Services.AddScoped<IRepository<AgentModel>>(sp =>
{
    var cosmosClient = sp.GetRequiredService<CosmosClient>();
    var cosmosSettings = builder.Configuration.GetSection("CosmosDb").Get<CosmosDbSettings>()!;
    return new CosmosRepository<AgentModel>(cosmosClient, cosmosSettings.DatabaseName, cosmosSettings.ContainerName);
});

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAgentService, AgentService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();

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

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed default user
using (var scope = app.Services.CreateScope())
{
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    try
    {
     //   await authService.CreateUserAsync("admin@volatix.com", "admin123", "Admin");
    }
    catch (InvalidOperationException)
    {
        // User already exists
    }
}

app.Run();

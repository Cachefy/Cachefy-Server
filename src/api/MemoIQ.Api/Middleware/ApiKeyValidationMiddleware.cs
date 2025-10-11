using Microsoft.Azure.Cosmos;
using MemoIQ.Infrastructure.Models;
using MemoIQ.Infrastructure.Repositories;

namespace MemoIQ.Api.Middleware
{
    public class ApiKeyValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private const string ApiKeyHeaderName = "X-Api-Key";

        public ApiKeyValidationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IRepository<Agent> agentRepository)
        {
            // Only validate API key for callback controller endpoints
            if (!context.Request.Path.StartsWithSegments("/api/callback"))
            {
                await _next(context);
                return;
            }

            // Check if API key header exists
            if (!context.Request.Headers.TryGetValue(ApiKeyHeaderName, out var extractedApiKey))
            {
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"message\":\"API Key is missing\"}");
                return;
            }

            // Query the Agent table to validate the API key
            try
            {
                var agents = await agentRepository.QueryAsync(
                    "SELECT * FROM c WHERE c.apiKey = @apikey AND c.isApiKeyActive = true",
                    new { apikey = extractedApiKey.ToString() }
                );

                var agent = agents.FirstOrDefault();

                if (agent == null)
                {
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync("{\"message\":\"Invalid API Key\"}");
                    return;
                }

                // Store the agent in HttpContext for use in controllers
                context.Items["Agent"] = agent;

                // API Key is valid, proceed to the next middleware/controller
                await _next(context);
            }
            catch (CosmosException ex)
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync($"{{\"message\":\"Error validating API Key: {ex.Message}\"}}");
                return;
            }
        }
    }

    // Extension method to register the middleware
    public static class ApiKeyValidationMiddlewareExtensions
    {
        public static IApplicationBuilder UseApiKeyValidation(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<ApiKeyValidationMiddleware>();
        }
    }
}

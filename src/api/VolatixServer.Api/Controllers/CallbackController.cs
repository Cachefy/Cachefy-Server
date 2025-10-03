using Microsoft.AspNetCore.Mvc;
using VolatixServer.Service.DTOs;
using VolatixServer.Service.Services;

namespace VolatixServer.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CallbackController : ControllerBase
    {
        private readonly IServiceService _serviceService;
        private readonly ILogger<CallbackController> _logger;

        public CallbackController(IServiceService serviceService, ILogger<CallbackController> logger)
        {
            _serviceService = serviceService;
            _logger = logger;
        }

        /// <summary>
        /// Register a new service using API Key authentication
        /// </summary>
        /// <remarks>
        /// This endpoint requires a valid API Key in the X-Api-Key header.
        /// The API Key must belong to an active agent.
        /// The agent ID is automatically extracted from the API Key and associated with the service.
        /// </remarks>
        /// <param name="createServiceDto">Service registration details (agentId is ignored if provided)</param>
        /// <returns>The created service</returns>
        [HttpPost("register-service")]
        public async Task<ActionResult<ServiceResponseDto>> RegisterService([FromBody] CreateServiceDto createServiceDto)
        {
            try
            {
                _logger.LogInformation("Service registration request received");

                // Get the agent from HttpContext (set by ApiKeyValidationMiddleware)
                var agent = HttpContext.Items["Agent"] as Infrastructure.Models.Agent;

                if (agent == null)
                {
                    _logger.LogError("Agent not found in HttpContext");
                    return BadRequest(new { message = "Agent information is missing" });
                }

                // Override the agentId with the authenticated agent's ID
                createServiceDto.AgentId = agent.Id;

                _logger.LogInformation(
                    "Registering service '{ServiceName}' for agent '{AgentName}' (ID: {AgentId})",
                    createServiceDto.Name,
                    agent.Name,
                    agent.Id
                );

                // Create the service
                var service = await _serviceService.CreateServiceAsync(createServiceDto);

                _logger.LogInformation(
                    "Service '{ServiceName}' registered successfully with ID: {ServiceId}",
                    service.Name,
                    service.Id
                );

                return CreatedAtAction(
                    nameof(RegisterService),
                    new { id = service.Id },
                    service
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering service");
                return StatusCode(500, new { message = "An error occurred while registering the service" });
            }
        }

        /// <summary>
        /// Health check endpoint for callback controller
        /// </summary>
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new 
            { 
                status = "healthy", 
                message = "Callback controller is running" 
            });
        }
    }
}

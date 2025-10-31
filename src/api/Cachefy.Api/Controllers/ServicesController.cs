using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Cachefy.Service.DTOs;
using Cachefy.Service.Services;

namespace Cachefy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ServicesController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        public ServicesController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        /// <summary>
        /// Get all services linked to the authenticated user
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServiceResponseDto>>> GetAllServices()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                var services = await _serviceService.GetServicesForUserAsync(userId);
                return Ok(services);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get unique service names for the authenticated user
        /// </summary>
        [HttpGet("names")]
        public async Task<ActionResult<IEnumerable<string>>> GetServiceNames()
        {
            try
            {
                var services = await _serviceService.GetAllServicesAsync();
                var serviceNames = services.Select(s => s.Name).Distinct().ToList();
                
                return Ok(serviceNames);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific service by ID (validates user has access)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponseDto>> GetService(string id)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                var service = await _serviceService.GetServiceByIdForUserAsync(id, userId);
                return Ok(service);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }
    }
}

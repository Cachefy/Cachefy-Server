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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServiceResponseDto>>> GetAllServices()
        {
            var services = await _serviceService.GetAllServicesAsync();
            return Ok(services);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceResponseDto>> GetService(string id)
        {
            try
            {
                var service = await _serviceService.GetServiceByIdAsync(id);
                return Ok(service);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}

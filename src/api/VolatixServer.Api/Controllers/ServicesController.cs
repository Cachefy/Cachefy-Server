using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VolatixServer.Service.DTOs;
using VolatixServer.Service.Services;

namespace VolatixServer.Api.Controllers
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

        [HttpPost]
        public async Task<ActionResult<ServiceResponseDto>> CreateService([FromBody] CreateServiceDto createServiceDto)
        {
            var service = await _serviceService.CreateServiceAsync(createServiceDto);
            return CreatedAtAction(nameof(GetService), new { id = service.Id }, service);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceResponseDto>> UpdateService(string id, [FromBody] UpdateServiceDto updateServiceDto)
        {
            try
            {
                var service = await _serviceService.UpdateServiceAsync(id, updateServiceDto);
                return Ok(service);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteService(string id)
        {
            try
            {
                await _serviceService.DeleteServiceAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}

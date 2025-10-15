using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Cachefy.Service.DTOs;
using Cachefy.Service.Services;

namespace Cachefy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CachesController : ControllerBase
    {
        private readonly ICacheService _cacheService;

        public CachesController(ICacheService cacheService)
        {
            _cacheService = cacheService;
        }

        /// <summary>
        /// Get all caches for a specific service from the external API
        /// </summary>
        /// <param name="serviceId">The GUID of the service</param>
        /// <returns>List of AgentResponse with all caches</returns>
        [HttpGet("keys")]
        public async Task<ActionResult<List<AgentResponse>>> GetAllCaches([FromQuery] string serviceId)
        {
            try
           {
                var result = await _cacheService.GetAllCachesAsync(serviceId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific cache by key for a service from the external API
        /// </summary>
        /// <param name="serviceId">The GUID of the service</param>
        /// <param name="key">The cache key to retrieve</param>
        /// <returns>List of AgentResponse with cache details</returns>
        [HttpGet]
        public async Task<ActionResult<object>> GetCacheByKey([FromQuery] string serviceId, [FromQuery] string key, [FromQuery] string id)
        {
            try
            {
                var result = await _cacheService.GetCacheByKeyAsync(serviceId, key, id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Flush all cache for a specific service
        /// </summary>
        /// <param name="serviceId">The GUID of the service</param>
        /// <returns>List of AgentResponse from the external API</returns>
        [HttpDelete("flushall")]
        public async Task<ActionResult<List<AgentResponse>>> FlushAllCache([FromQuery] string serviceId)
        {
            try
            {
                var result = await _cacheService.FlushAllCacheAsync(serviceId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Clear cache by key for a specific service
        /// </summary>
        /// <param name="serviceId">The GUID of the service</param>
        /// <param name="key">The cache key to clear</param>
        /// <returns>List of AgentResponse from the external API</returns>
        [HttpDelete("clear")]
        public async Task<ActionResult<List<AgentResponse>>> ClearCacheByKey([FromQuery] string serviceId, [FromQuery] string key)
        {
            try
            {
                var result = await _cacheService.ClearCacheByKeyAsync(serviceId, key);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}

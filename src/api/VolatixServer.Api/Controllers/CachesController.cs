using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VolatixServer.Service.DTOs;
using VolatixServer.Service.Services;

namespace VolatixServer.Api.Controllers
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
        /// <returns>ServiceFabricAgentResponse with all caches</returns>
        [HttpGet("{serviceId}")]
        public async Task<ActionResult<ServiceFabricAgentResponse>> GetAllCaches(string serviceId)
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
        /// <param name="cacheKey">The cache key to retrieve</param>
        /// <returns>ServiceFabricAgentResponse with cache details</returns>
        [HttpGet("{serviceId}/{cacheKey}")]
        public async Task<ActionResult<ServiceFabricAgentResponse>> GetCacheByKey(string serviceId, string cacheKey)
        {
            try
            {
                var result = await _cacheService.GetCacheByKeyAsync(serviceId, cacheKey);
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
        /// <returns>ServiceFabricAgentResponse from the external API</returns>
        [HttpPost("flushall/{serviceId}")]
        public async Task<ActionResult<ServiceFabricAgentResponse>> FlushAllCache(string serviceId)
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
        /// <param name="cacheKey">The cache key to clear</param>
        /// <returns>ServiceFabricAgentResponse from the external API</returns>
        [HttpDelete("clear/{serviceId}/{cacheKey}")]
        public async Task<ActionResult<ServiceFabricAgentResponse>> ClearCacheByKey(string serviceId, string cacheKey)
        {
            try
            {
                var result = await _cacheService.ClearCacheByKeyAsync(serviceId, cacheKey);
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

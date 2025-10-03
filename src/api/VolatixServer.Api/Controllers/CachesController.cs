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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CacheResponseDto>>> GetAllCaches()
        {
            var caches = await _cacheService.GetAllCachesAsync();
            return Ok(caches);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CacheResponseDto>> GetCache(string id)
        {
            try
            {
                var cache = await _cacheService.GetCacheByIdAsync(id);
                return Ok(cache);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<CacheResponseDto>> CreateCache([FromBody] CreateCacheDto createCacheDto)
        {
            var cache = await _cacheService.CreateCacheAsync(createCacheDto);
            return CreatedAtAction(nameof(GetCache), new { id = cache.Id }, cache);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<CacheResponseDto>> UpdateCache(string id, [FromBody] UpdateCacheDto updateCacheDto)
        {
            try
            {
                var cache = await _cacheService.UpdateCacheAsync(id, updateCacheDto);
                return Ok(cache);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteCache(string id)
        {
            try
            {
                await _cacheService.DeleteCacheAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
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

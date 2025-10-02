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
    }
}

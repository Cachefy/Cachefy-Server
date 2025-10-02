using VolatixServer.Infrastructure.Models;
using VolatixServer.Infrastructure.Repositories;
using VolatixServer.Service.DTOs;

namespace VolatixServer.Service.Services
{
    public interface ICacheService
    {
        Task<IEnumerable<CacheResponseDto>> GetAllCachesAsync();
        Task<CacheResponseDto> GetCacheByIdAsync(string id);
        Task<CacheResponseDto> CreateCacheAsync(CreateCacheDto createCacheDto);
        Task<CacheResponseDto> UpdateCacheAsync(string id, UpdateCacheDto updateCacheDto);
        Task DeleteCacheAsync(string id);
    }

    public class CacheService : ICacheService
    {
        private readonly IRepository<Cache> _cacheRepository;

        public CacheService(IRepository<Cache> cacheRepository)
        {
            _cacheRepository = cacheRepository;
        }

        public async Task<IEnumerable<CacheResponseDto>> GetAllCachesAsync()
        {
            var caches = await _cacheRepository.GetAllAsync();
            return caches.Select(MapToResponseDto);
        }

        public async Task<CacheResponseDto> GetCacheByIdAsync(string id)
        {
            var cache = await _cacheRepository.GetByIdAsync(id);
            if (cache == null)
                throw new KeyNotFoundException($"Cache with ID {id} not found");
                
            return MapToResponseDto(cache);
        }

        public async Task<CacheResponseDto> CreateCacheAsync(CreateCacheDto createCacheDto)
        {
            var cache = new Cache
            {
                Name = createCacheDto.Name,
                Size = createCacheDto.Size,
                Type = createCacheDto.Type,
                Status = createCacheDto.Status
            };

            var createdCache = await _cacheRepository.CreateAsync(cache);
            return MapToResponseDto(createdCache);
        }

        public async Task<CacheResponseDto> UpdateCacheAsync(string id, UpdateCacheDto updateCacheDto)
        {
            var cache = await _cacheRepository.GetByIdAsync(id);
            if (cache == null)
                throw new KeyNotFoundException($"Cache with ID {id} not found");

            if (!string.IsNullOrEmpty(updateCacheDto.Name))
                cache.Name = updateCacheDto.Name;
                
            if (!string.IsNullOrEmpty(updateCacheDto.Size))
                cache.Size = updateCacheDto.Size;
                
            if (!string.IsNullOrEmpty(updateCacheDto.Type))
                cache.Type = updateCacheDto.Type;
                
            if (!string.IsNullOrEmpty(updateCacheDto.Status))
                cache.Status = updateCacheDto.Status;

            var updatedCache = await _cacheRepository.UpdateAsync(cache);
            return MapToResponseDto(updatedCache);
        }

        public async Task DeleteCacheAsync(string id)
        {
            await _cacheRepository.DeleteAsync(id);
        }

        private static CacheResponseDto MapToResponseDto(Cache cache)
        {
            return new CacheResponseDto
            {
                Id = cache.Id,
                Name = cache.Name,
                Size = cache.Size,
                Type = cache.Type,
                Status = cache.Status,
                CreatedAt = cache.CreatedAt,
                UpdatedAt = cache.UpdatedAt
            };
        }
    }
}

using VolatixServer.Infrastructure.Models;
using VolatixServer.Infrastructure.Repositories;
using VolatixServer.Service.DTOs;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace VolatixServer.Service.Services
{
    public interface ICacheService
    {
        Task<IEnumerable<CacheResponseDto>> GetAllCachesAsync();
        Task<CacheResponseDto> GetCacheByIdAsync(string id);
        Task<CacheResponseDto> CreateCacheAsync(CreateCacheDto createCacheDto);
        Task<CacheResponseDto> UpdateCacheAsync(string id, UpdateCacheDto updateCacheDto);
        Task DeleteCacheAsync(string id);
        Task<ServiceFabricAgentResponse> FlushAllCacheAsync(string serviceId);
        Task<ServiceFabricAgentResponse> ClearCacheByKeyAsync(string serviceId, string cacheKey);
    }

    public class CacheService : ICacheService
    {
        private readonly IRepository<Cache> _cacheRepository;
        private readonly IRepository<Infrastructure.Models.Service> _serviceRepository;
        private readonly IRepository<Agent> _agentRepository;
        private readonly IHttpClientFactory _httpClientFactory;

        public CacheService(
            IRepository<Cache> cacheRepository,
            IRepository<Infrastructure.Models.Service> serviceRepository,
            IRepository<Agent> agentRepository,
            IHttpClientFactory httpClientFactory)
        {
            _cacheRepository = cacheRepository;
            _serviceRepository = serviceRepository;
            _agentRepository = agentRepository;
            _httpClientFactory = httpClientFactory;
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

        public async Task<ServiceFabricAgentResponse> FlushAllCacheAsync(string serviceId)
        {
            // Get the service
            var service = await _serviceRepository.GetByIdAsync(serviceId);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {serviceId} not found");

            // Check if service has an agent
            if (string.IsNullOrEmpty(service.AgentId))
                throw new InvalidOperationException($"Service {service.Name} does not have an associated agent");

            // Get the agent
            var agent = await _agentRepository.GetByIdAsync(service.AgentId);
            if (agent == null)
                throw new KeyNotFoundException($"Agent with ID {service.AgentId} not found");

            // Check if agent is active
            if (!agent.IsApiKeyActive)
                throw new InvalidOperationException($"Agent {agent.Name} API key is not active");

            // Make HTTP request to external API
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Api-Key", agent.ApiKey);

            var url = $"{agent.Url.TrimEnd('/')}/api/cache/{service.Name}/flushall";

            try
            {
                var response = await client.PostAsync(url, null);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Failed to flush cache for service {service.Name}. Status: {response.StatusCode}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var agentResponse = JsonSerializer.Deserialize<ServiceFabricAgentResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return agentResponse ?? throw new InvalidOperationException("Failed to deserialize agent response");
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"Failed to flush cache for service {service.Name}: {ex.Message}", ex);
            }
        }

        public async Task<ServiceFabricAgentResponse> ClearCacheByKeyAsync(string serviceId, string cacheKey)
        {
            // Get the service
            var service = await _serviceRepository.GetByIdAsync(serviceId);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {serviceId} not found");

            // Check if service has an agent
            if (string.IsNullOrEmpty(service.AgentId))
                throw new InvalidOperationException($"Service {service.Name} does not have an associated agent");

            // Get the agent
            var agent = await _agentRepository.GetByIdAsync(service.AgentId);
            if (agent == null)
                throw new KeyNotFoundException($"Agent with ID {service.AgentId} not found");

            // Check if agent is active
            if (!agent.IsApiKeyActive)
                throw new InvalidOperationException($"Agent {agent.Name} API key is not active");

            // Make HTTP request to external API
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Api-Key", agent.ApiKey);

            var url = $"{agent.Url.TrimEnd('/')}/api/cache/{service.Name}/clear/{cacheKey}";

            try
            {
                var response = await client.DeleteAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Failed to clear cache key '{cacheKey}' for service {service.Name}. Status: {response.StatusCode}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var agentResponse = JsonSerializer.Deserialize<ServiceFabricAgentResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return agentResponse ?? throw new InvalidOperationException("Failed to deserialize agent response");
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"Failed to clear cache key '{cacheKey}' for service {service.Name}: {ex.Message}", ex);
            }
        }
    }
}

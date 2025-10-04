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
        Task<List<AgentResponse>> GetAllCachesAsync(string serviceId);
        Task<object> GetCacheByKeyAsync(string serviceId, string cacheKey, string id);
        Task<List<AgentResponse>> FlushAllCacheAsync(string serviceId);
        Task<List<AgentResponse>> ClearCacheByKeyAsync(string serviceId, string cacheKey);
    }

    public class CacheService : ICacheService
    {
        private readonly IRepository<Infrastructure.Models.Service> _serviceRepository;
        private readonly IRepository<Agent> _agentRepository;
        private readonly IHttpClientFactory _httpClientFactory;

        public CacheService(
            IRepository<Infrastructure.Models.Service> serviceRepository,
            IRepository<Agent> agentRepository,
            IHttpClientFactory httpClientFactory)
        {
            _serviceRepository = serviceRepository;
            _agentRepository = agentRepository;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<List<AgentResponse>> GetAllCachesAsync(string serviceId)
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

            var url = $"{agent.Url.TrimEnd('/')}/api/cache/keys?serviceIdentifier={service.Name}";

            try
            {
                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Failed to get caches for service {service.Name}. Status: {response.StatusCode}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var agentResponse = JsonSerializer.Deserialize<List<AgentResponse>>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return agentResponse ?? throw new InvalidOperationException("Failed to deserialize agent response");
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"Failed to get caches for service {service.Name}: {ex.Message}", ex);
            }
        }

        public async Task<object> GetCacheByKeyAsync(string serviceId, string cacheKey, string id)
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

            var url = $"{agent.Url.TrimEnd('/')}/api/cache?serviceIdentifier={service.Name}&key={cacheKey}&id={id}";

            try
            {
                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Failed to get cache key '{cacheKey}' for service {service.Name}. Status: {response.StatusCode}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var agentResponse = JsonSerializer.Deserialize<List<AgentResponse>>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if(agentResponse != null)
                {
                    var cache = agentResponse.FirstOrDefault(f => f.Id == id)?.CacheResult;

                    return cache;
                }
                
                return string.Empty;
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"Failed to get cache key '{cacheKey}' for service {service.Name}: {ex.Message}", ex);
            }
        }

        public async Task<List<AgentResponse>> FlushAllCacheAsync(string serviceId)
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

            var url = $"{agent.Url.TrimEnd('/')}/api/cache/flushall?serviceIdentifier={service.Name}";

            try
            {
                var response = await client.DeleteAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Failed to flush cache for service {service.Name}. Status: {response.StatusCode}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var agentResponse = JsonSerializer.Deserialize<List<AgentResponse>>(responseContent, new JsonSerializerOptions
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

        public async Task<List<AgentResponse>> ClearCacheByKeyAsync(string serviceId, string cacheKey)
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

            var url = $"{agent.Url.TrimEnd('/')}/api/cache?serviceIdentifier={service.Name}&key={cacheKey}";

            try
            {
                var response = await client.DeleteAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Failed to clear cache key '{cacheKey}' for service {service.Name}. Status: {response.StatusCode}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var agentResponse = JsonSerializer.Deserialize<List<AgentResponse>>(responseContent, new JsonSerializerOptions
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

using Cachefy.Infrastructure.Models;
using Cachefy.Infrastructure.Repositories;
using Cachefy.Service.DTOs;

namespace Cachefy.Service.Services
{
    public interface IAgentService
    {
        Task<IEnumerable<AgentResponseDto>> GetAllAgentsAsync();
        Task<AgentResponseDto> GetAgentByIdAsync(string id);
        Task<AgentResponseDto> CreateAgentAsync(CreateAgentDto createAgentDto);
        Task<AgentResponseDto> UpdateAgentAsync(string id, UpdateAgentDto updateAgentDto);
        Task DeleteAgentAsync(string id);
        Task<string> RegenerateApiKeyAsync(string id);
        Task<AgentPingResponseDto> PingAgentAsync(string id);
    }

    public class AgentService : IAgentService
    {
        private readonly IRepository<Agent> _agentRepository;
        private readonly IApiKeyService _apiKeyService;
        private readonly IHttpClientFactory _httpClientFactory;

        public AgentService(IRepository<Agent> agentRepository, IApiKeyService apiKeyService, IHttpClientFactory httpClientFactory)
        {
            _agentRepository = agentRepository;
            _apiKeyService = apiKeyService;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IEnumerable<AgentResponseDto>> GetAllAgentsAsync()
        {
            var agents = await _agentRepository.GetAllAsync();
            return agents.Select(MapToResponseDto);
        }

        public async Task<AgentResponseDto> GetAgentByIdAsync(string id)
        {
            var agent = await _agentRepository.GetByIdAsync(id);
            if (agent == null)
                throw new KeyNotFoundException($"Agent with ID {id} not found");

            return MapToResponseDto(agent);
        }

        public async Task<AgentResponseDto> CreateAgentAsync(CreateAgentDto createAgentDto)
        {
            var agent = new Agent
            {
                Name = createAgentDto.Name,
                Url = createAgentDto.Url,
                ApiKey = _apiKeyService.GenerateApiKey(),
                IsApiKeyActive = true
            };

            var createdAgent = await _agentRepository.CreateAsync(agent);
            return MapToResponseDto(createdAgent);
        }

        public async Task<AgentResponseDto> UpdateAgentAsync(string id, UpdateAgentDto updateAgentDto)
        {
            var agent = await _agentRepository.GetByIdAsync(id);

            if (agent == null)
                throw new KeyNotFoundException($"Agent with ID {id} not found");

            agent.Name = updateAgentDto.Name;

            agent.Url = updateAgentDto.Url;

            var updatedAgent = await _agentRepository.UpdateAsync(agent);
            return MapToResponseDto(updatedAgent);
        }

        public async Task DeleteAgentAsync(string id)
        {
            await _agentRepository.DeleteAsync(id);
        }

        public async Task<string> RegenerateApiKeyAsync(string id)
        {
            var agent = await _agentRepository.GetByIdAsync(id);
            if (agent == null)
                throw new KeyNotFoundException($"Agent with ID {id} not found");

            agent.ApiKey = _apiKeyService.GenerateApiKey();
            agent.IsApiKeyActive = true;

            await _agentRepository.UpdateAsync(agent);
            return agent.ApiKey;
        }

        public async Task<AgentPingResponseDto> PingAgentAsync(string id)
        {
            // Get the agent details
            var agent = await _agentRepository.GetByIdAsync(id);
            if (agent == null)
                throw new KeyNotFoundException($"Agent with ID {id} not found");

            // Create HTTP client
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5); // 5 second timeout

            // Construct the ping URL (assuming agent has a health endpoint)
            var pingUrl = $"{agent.Url.TrimEnd('/')}/api/HealthCheck";

            try
            {
                // Make the request to the external API

                client.DefaultRequestHeaders.Add("x-api-key", agent.ApiKey);
                var response = await client.GetAsync(pingUrl);

                if(!response.IsSuccessStatusCode)
                {
                    // Try to parse the response content
                    try
                    {
                        var content = await response.Content.ReadAsStringAsync();

                        var pingResponse = System.Text.Json.JsonSerializer.Deserialize<PingResponse>(content);
                        if (pingResponse != null && !string.IsNullOrEmpty(pingResponse.error))
                        {
                            return new AgentPingResponseDto
                            {
                                StatusCode = (int)response.StatusCode,
                                Message = pingResponse.error
                            };
                        }
                    }
                    catch (System.Text.Json.JsonException)
                    {
                        // Ignore JSON parsing errors, just return status code
                    }
                  
                    return new AgentPingResponseDto
                    {
                        StatusCode = (int)response.StatusCode,
                    };
                }

                // Successful ping
                return new AgentPingResponseDto
                {
                    StatusCode = (int)response.StatusCode,
                };
            }
            catch (HttpRequestException ex)
            {
                // Network error or connection refused
                return new AgentPingResponseDto
                {
                    StatusCode = 503, // Service Unavailable
                    Message = $"Failed to reach agent: {ex.Message}"
                };
            }
            catch (TaskCanceledException)
            {
                // Timeout
                return new AgentPingResponseDto
                {
                    StatusCode = 408, // Request Timeout
                    Message = "Agent did not respond within timeout period"
                };
            }
        }

        private static AgentResponseDto MapToResponseDto(Agent agent)
        {
            return new AgentResponseDto
            {
                Id = agent.Id,
                Name = agent.Name,
                Url = agent.Url,
                ApiKey = agent.ApiKey,
                IsApiKeyActive = agent.IsApiKeyActive,
                CreatedAt = agent.CreatedAt,
                UpdatedAt = agent.UpdatedAt
            };
        }

        internal class PingResponse
        {
            public string? error { get; set; }
        }
    }
}

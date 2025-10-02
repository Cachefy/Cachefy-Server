using VolatixServer.Infrastructure.Models;
using VolatixServer.Infrastructure.Repositories;
using VolatixServer.Service.DTOs;

namespace VolatixServer.Service.Services
{
    public interface IAgentService
    {
        Task<IEnumerable<AgentResponseDto>> GetAllAgentsAsync();
        Task<AgentResponseDto> GetAgentByIdAsync(string id);
        Task<AgentResponseDto> CreateAgentAsync(CreateAgentDto createAgentDto);
        Task<AgentResponseDto> UpdateAgentAsync(string id, UpdateAgentDto updateAgentDto);
        Task DeleteAgentAsync(string id);
        Task<string> RegenerateApiKeyAsync(string id);
    }

    public class AgentService : IAgentService
    {
        private readonly IRepository<Agent> _agentRepository;
        private readonly IApiKeyService _apiKeyService;

        public AgentService(IRepository<Agent> agentRepository, IApiKeyService apiKeyService)
        {
            _agentRepository = agentRepository;
            _apiKeyService = apiKeyService;
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
    }
}

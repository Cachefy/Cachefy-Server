using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Cachefy.Service.DTOs;
using Cachefy.Service.Services;

namespace Cachefy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AgentsController : ControllerBase
    {
        private readonly IAgentService _agentService;

        public AgentsController(IAgentService agentService)
        {
            _agentService = agentService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AgentResponseDto>>> GetAllAgents()
        {
            var agents = await _agentService.GetAllAgentsAsync();
            return Ok(agents);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AgentResponseDto>> GetAgent(string id)
        {
            try
            {
                var agent = await _agentService.GetAgentByIdAsync(id);
                return Ok(agent);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<AgentResponseDto>> CreateAgent([FromBody] CreateAgentDto createAgentDto)
        {
            var agent = await _agentService.CreateAgentAsync(createAgentDto);
            return CreatedAtAction(nameof(GetAgent), new { id = agent.Id }, agent);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<AgentResponseDto>> UpdateAgent(string id, [FromBody] UpdateAgentDto updateAgentDto)
        {
            try
            {
                var agent = await _agentService.UpdateAgentAsync(id, updateAgentDto);
                return Ok(agent);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteAgent(string id)
        {
            try
            {
                await _agentService.DeleteAgentAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/regenerate-api-key")]
        public async Task<ActionResult<string>> RegenerateApiKey(string id)
        {
            try
            {
                var newApiKey = await _agentService.RegenerateApiKeyAsync(id);
                return Ok(new { apiKey = newApiKey });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Ping an agent to check if it's reachable
        /// </summary>
        /// <param name="id">The agent ID</param>
        /// <returns>HTTP status code from the agent's health endpoint</returns>
        [HttpGet("{id}/ping")]
        public async Task<ActionResult<AgentPingResponseDto>> PingAgent(string id)
        {
            try
            {
                var result = await _agentService.PingAgentAsync(id); 
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}

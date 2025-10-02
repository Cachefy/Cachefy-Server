using System.ComponentModel.DataAnnotations;

namespace VolatixServer.Service.DTOs
{
    public class CreateAgentDto
    {
        [Required]
        public string Name { get; set; } = null!;
        
        [Required]
        public string Url { get; set; } = null!;
    }
    
    public class UpdateAgentDto
    {
        [Required]
        public string Name { get; set; } = null!;

        [Required]
        public string Url { get; set; } = null!;
    }
    
    public class AgentResponseDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Url { get; set; }
        public string ApiKey { get; set; }
        public bool IsApiKeyActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

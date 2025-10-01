using System.ComponentModel.DataAnnotations;

namespace VolatixServer.Service.DTOs
{
    public class CreateAgentDto
    {
        [Required]
        public string Name { get; set; }
        
        public string Status { get; set; } = "Active";
    }
    
    public class UpdateAgentDto
    {
        public string Name { get; set; }
        public string Status { get; set; }
    }
    
    public class AgentResponseDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string ApiKey { get; set; }
        public bool IsApiKeyActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

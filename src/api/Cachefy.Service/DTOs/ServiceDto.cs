using System.ComponentModel.DataAnnotations;

namespace Cachefy.Service.DTOs
{
    public class CreateServiceDto
    {
        [Required]
        public string Name { get; set; } = null!;
        
        public string Status { get; set; }

        public string Version { get; set; }

        public string? AgentId { get; set; }
    }
    
    public class UpdateServiceDto
    {
        public string? Name { get; set; }
        
         public string Version { get; set; }
        
        public string? Status { get; set; }
        
        public string? AgentId { get; set; }
    }
    
    public class ServiceResponseDto
    {
        public string Id { get; set; } = null!;
        public string Name { get; set; } = null!;
       public string Version { get; set; }
        public int Port { get; set; }
        public string Status { get; set; } = null!;
        public string? AgentId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

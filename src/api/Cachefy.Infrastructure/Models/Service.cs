using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Cachefy.Infrastructure.Models
{
    public class Service : BaseEntity
    {
        [JsonProperty("name")]
        [Required]
        public string Name { get; set; }
        
        [JsonProperty("status")]
        public string Status { get; set; } = "Running";
        
        [JsonProperty("version")]
        public string Version { get; set; }
        
        [JsonProperty("agentId")]
        public string? AgentId { get; set; }

        public Service()
        {
            PartitionKey = "services";
        }
    }
}

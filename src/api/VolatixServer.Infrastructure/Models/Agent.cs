using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace VolatixServer.Infrastructure.Models
{
    public class Agent : BaseEntity
    {
        [JsonProperty("name")]
        [Required]
        public string Name { get; set; }
        
        [JsonProperty("status")]
        public string Status { get; set; } = "Active";
        
        [JsonProperty("apiKey")]
        public string ApiKey { get; set; }
        
        [JsonProperty("isApiKeyActive")]
        public bool IsApiKeyActive { get; set; } = true;

        public Agent()
        {
            PartitionKey = "agents";
        }
    }
}

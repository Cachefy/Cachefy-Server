using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace MemoIQ.Infrastructure.Models
{
    public class Agent : BaseEntity
    {
        [JsonProperty("name")]
        [Required]
        public string Name { get; set; }
        
        [JsonProperty("url")]
        [Required]
        public string Url { get; set; }
        
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

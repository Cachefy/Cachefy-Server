using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Cachefy.Infrastructure.Models
{
    public class BaseEntity
    {
        [JsonProperty("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [JsonProperty("partitionKey")]
        public string PartitionKey { get; set; }
        
        [JsonProperty("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [JsonProperty("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [JsonProperty("version")]
        public string Version { get; set; } = "1.0";
    }
}

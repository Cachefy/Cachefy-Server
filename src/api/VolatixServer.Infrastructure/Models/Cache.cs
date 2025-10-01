using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace VolatixServer.Infrastructure.Models
{
    public class Cache : BaseEntity
    {
        [JsonProperty("name")]
        [Required]
        public string Name { get; set; }
        
        [JsonProperty("type")]
        public string Type { get; set; } = "Redis";
        
        [JsonProperty("size")]
        public string Size { get; set; }
        
        [JsonProperty("status")]
        public string Status { get; set; } = "Active";

        public Cache()
        {
            PartitionKey = "caches";
        }
    }
}

using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace VolatixServer.Infrastructure.Models
{
    public class Service : BaseEntity
    {
        [JsonProperty("name")]
        [Required]
        public string Name { get; set; }
        
        [JsonProperty("status")]
        public string Status { get; set; } = "Running";
        
        [JsonProperty("port")]
        public int Port { get; set; }
        
        [JsonProperty("description")]
        public string Description { get; set; }

        public Service()
        {
            PartitionKey = "services";
        }
    }
}

using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Cachefy.Infrastructure.Models
{
    public class User : BaseEntity
    {
        [JsonProperty("email")]
        [Required]
        public string Email { get; set; }
        
        [JsonProperty("passwordHash")]
        [Required]
        public string PasswordHash { get; set; }
        
        [JsonProperty("role")]
        public string Role { get; set; } = "Admin";

        public User()
        {
            PartitionKey = "users";
        }
    }
}

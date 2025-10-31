using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace Cachefy.Infrastructure.Models
{
    public class User : BaseEntity
    {
        [JsonProperty("email")]
        [Required]
        public string Email { get; set; } = null!;
        
        [JsonProperty("passwordHash")]
        [Required]
        public string PasswordHash { get; set; } = null!;
        
        [JsonProperty("role")]
        public string Role { get; set; } = "Admin";

        [JsonProperty("linkedServiceNames")]
        public List<string> LinkedServiceNames { get; set; } = new List<string>();

        public User()
        {
            PartitionKey = "users";
        }
    }
}

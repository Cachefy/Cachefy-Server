using System.ComponentModel.DataAnnotations;

namespace Cachefy.Service.DTOs
{
    public class LoginDto
    {
        [Required]
        public string Email { get; set; }
        
        [Required]
        public string Password { get; set; }
    }
    
    public class LoginResponseDto
    {
        public string Token { get; set; }
        public string Email { get; set; }
    }
}

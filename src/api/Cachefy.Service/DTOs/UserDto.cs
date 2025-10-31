using System.ComponentModel.DataAnnotations;

namespace Cachefy.Service.DTOs
{
    public class UserResponseDto
    {
        public string Id { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public List<string> LinkedServiceNames { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UserServiceDto
    {
        public string Id { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Version { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? AgentId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AddServiceToUserDto
    {
        [Required]
        public string ServiceName { get; set; } = null!;
    }

    public class RemoveServiceFromUserDto
    {
        [Required]
        public string ServiceName { get; set; } = null!;
    }

    public class CreateUserDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = null!;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = null!;

        public string Role { get; set; } = "User";

        public List<string>? LinkedServiceNames { get; set; }
    }

    public class UpdateUserDto
    {
        [EmailAddress]
        public string? Email { get; set; }

        [MinLength(6)]
        public string? Password { get; set; }

        public string? Role { get; set; }

        public List<string>? LinkedServiceNames { get; set; }
    }
}


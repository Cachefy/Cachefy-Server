using System.ComponentModel.DataAnnotations;

namespace MemoIQ.Service.DTOs
{
    public class CreateCacheDto
    {
        [Required]
        public string Name { get; set; } = null!;
        
        [Required]
        public string Size { get; set; } = null!;
        
        public string Type { get; set; } = "Redis";
        
        public string Status { get; set; } = "Active";
    }
    
    public class UpdateCacheDto
    {
        public string? Name { get; set; }
        
        public string? Size { get; set; }
        
        public string? Type { get; set; }
        
        public string? Status { get; set; }
    }
    
    public class CacheResponseDto
    {
        public string Id { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Size { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

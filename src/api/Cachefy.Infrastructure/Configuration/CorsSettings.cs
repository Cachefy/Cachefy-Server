namespace Cachefy.Infrastructure.Configuration;

public class CorsSettings
{
    public string PolicyName { get; set; } = string.Empty;
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
    public bool AllowAnyMethod { get; set; } = true;
    public bool AllowAnyHeader { get; set; } = true;
    public bool AllowCredentials { get; set; } = false;
    public bool AllowWildcardSubdomains { get; set; } = false;
    public bool ExposeAllHeaders { get; set; } = false;
    public string[] ExposedHeaders { get; set; } = Array.Empty<string>();
}

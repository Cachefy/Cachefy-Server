using System.Security.Cryptography;
using System.Text;

namespace MemoIQ.Service.Services
{
    public interface IApiKeyService
    {
        string GenerateApiKey();
    }

    public class ApiKeyService : IApiKeyService
    {
        public string GenerateApiKey()
        {
            // Generate random bytes
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }

            // Convert to Base64
            return Convert.ToBase64String(randomBytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
        }
    }
}

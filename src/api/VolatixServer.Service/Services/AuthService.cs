using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using VolatixServer.Infrastructure.Models;
using VolatixServer.Infrastructure.Repositories;
using VolatixServer.Service.DTOs;

namespace VolatixServer.Service.Services
{
    public interface IAuthService
    {
        Task<LoginResponseDto> LoginAsync(LoginDto loginDto);
        Task<User> CreateUserAsync(string email, string password, string role = "Admin");
    }

    public class AuthService : IAuthService
    {
        private readonly IRepository<User> _userRepository;
        private readonly IConfiguration _configuration;

        public AuthService(IRepository<User> userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        public async Task<LoginResponseDto> LoginAsync(LoginDto loginDto)
        {
            var users = await _userRepository.QueryAsync(
                "SELECT * FROM c WHERE c.email = @email",
                new { email = loginDto.Email }
            );
            
            var user = users.FirstOrDefault();
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            var token = GenerateJwtToken(user);
            
            return new LoginResponseDto
            {
                Token = token,
                Email = user.Email
            };
        }

        public async Task<User> CreateUserAsync(string email, string password, string role = "Admin")
        {
            var existingUsers = await _userRepository.QueryAsync(
                "SELECT * FROM c WHERE c.email = @email",
                new { email = email }
            );
            
            if (existingUsers.Any())
            {
                throw new InvalidOperationException("User already exists");
            }

            var user = new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = role
            };

            return await _userRepository.CreateAsync(user);
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured");
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("JWT Issuer is not configured");
            var jwtExpireHours = int.Parse(_configuration["Jwt:ExpireHours"] ?? "24");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("userId", user.Id)
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtIssuer,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(jwtExpireHours),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

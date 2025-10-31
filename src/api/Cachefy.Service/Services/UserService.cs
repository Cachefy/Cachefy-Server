using System.Security.Claims;
using Cachefy.Infrastructure.Models;
using Cachefy.Infrastructure.Repositories;
using Cachefy.Service.DTOs;

namespace Cachefy.Service.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDto>> GetAllUsersAsync();
        Task<UserResponseDto> GetUserByIdAsync(string userId);
        Task<IEnumerable<UserServiceDto>> GetUserLinkedServicesAsync(string userId);
        Task<IEnumerable<string>> GetUserLinkedServiceNamesAsync(string userId);
        Task<UserResponseDto> CreateUserAsync(CreateUserDto createUserDto);
        Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserDto updateUserDto);
        Task DeleteUserAsync(string userId);
        Task<UserResponseDto> AddServiceToUserAsync(string userId, string serviceName);
        Task<UserResponseDto> RemoveServiceFromUserAsync(string userId, string serviceName);
        Task<UserResponseDto> UpdateUserServicesAsync(string userId, List<string> serviceNames);
    }

    public class UserService : IUserService
    {
        private readonly IRepository<User> _userRepository;
        private readonly IRepository<Infrastructure.Models.Service> _serviceRepository;

        public UserService(
            IRepository<User> userRepository,
            IRepository<Infrastructure.Models.Service> serviceRepository)
        {
            _userRepository = userRepository;
            _serviceRepository = serviceRepository;
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllAsync();
            return users.Select(MapToUserResponseDto);
        }

        public async Task<UserResponseDto> GetUserByIdAsync(string userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            return MapToUserResponseDto(user);
        }

        public async Task<IEnumerable<UserServiceDto>> GetUserLinkedServicesAsync(string userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            if (user.LinkedServiceNames == null || !user.LinkedServiceNames.Any())
                return new List<UserServiceDto>();

            // Get all services linked to the user by name
            var services = new List<UserServiceDto>();
            foreach (var serviceName in user.LinkedServiceNames)
            {
                try
                {
                    var query = "SELECT * FROM c WHERE c.name = @name";
                    var serviceList = await _serviceRepository.QueryAsync(query, new { name = serviceName });
                    var service = serviceList.FirstOrDefault();
                    if (service != null)
                    {
                        services.Add(MapToUserServiceDto(service));
                    }
                }
                catch (Exception)
                {
                    // Skip services that no longer exist
                    continue;
                }
            }

            return services;
        }

        public async Task<IEnumerable<string>> GetUserLinkedServiceNamesAsync(string userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            if (user.LinkedServiceNames == null || !user.LinkedServiceNames.Any())
                return new List<string>();

            // Return unique service names (remove duplicates)
            return user.LinkedServiceNames.Distinct().ToList();
        }

        public async Task<UserResponseDto> CreateUserAsync(CreateUserDto createUserDto)
        {
            // Check if user already exists
            var existingUsers = await _userRepository.QueryAsync(
                "SELECT * FROM c WHERE c.email = @email",
                new { email = createUserDto.Email }
            );
            
            if (existingUsers.Any())
                throw new InvalidOperationException($"User with email '{createUserDto.Email}' already exists");

            // Validate linked service names if provided
            if (createUserDto.LinkedServiceNames != null && createUserDto.LinkedServiceNames.Any())
            {
                foreach (var serviceName in createUserDto.LinkedServiceNames)
                {
                    var query = "SELECT * FROM c WHERE c.name = @name";
                    var serviceList = await _serviceRepository.QueryAsync(query, new { name = serviceName });
                    if (!serviceList.Any())
                        throw new KeyNotFoundException($"Service with name '{serviceName}' not found");
                }
            }

            // Create new user
            var user = new User
            {
                Email = createUserDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password),
                Role = createUserDto.Role ?? "User",
                LinkedServiceNames = createUserDto.LinkedServiceNames ?? new List<string>()
            };

            var createdUser = await _userRepository.CreateAsync(user);
            return MapToUserResponseDto(createdUser);
        }

        public async Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserDto updateUserDto)
        {
            // Get existing user
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            // Update email if provided
            if (!string.IsNullOrEmpty(updateUserDto.Email))
            {
                // Check if new email is already in use by another user
                var existingUsers = await _userRepository.QueryAsync(
                    "SELECT * FROM c WHERE c.email = @email AND c.id != @userId",
                    new { email = updateUserDto.Email, userId = userId }
                );
                
                if (existingUsers.Any())
                    throw new InvalidOperationException($"Email '{updateUserDto.Email}' is already in use");
                
                user.Email = updateUserDto.Email;
            }

            // Update password if provided
            if (!string.IsNullOrEmpty(updateUserDto.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(updateUserDto.Password);
            }

            // Update role if provided
            if (!string.IsNullOrEmpty(updateUserDto.Role))
            {
                user.Role = updateUserDto.Role;
            }

            // Update linked services if provided
            if (updateUserDto.LinkedServiceNames != null)
            {
                // Validate all service names exist
                foreach (var serviceName in updateUserDto.LinkedServiceNames)
                {
                    var query = "SELECT * FROM c WHERE c.name = @name";
                    var serviceList = await _serviceRepository.QueryAsync(query, new { name = serviceName });
                    if (!serviceList.Any())
                        throw new KeyNotFoundException($"Service with name '{serviceName}' not found");
                }
                
                user.LinkedServiceNames = updateUserDto.LinkedServiceNames;
            }

            var updatedUser = await _userRepository.UpdateAsync(user);
            return MapToUserResponseDto(updatedUser);
        }

        public async Task DeleteUserAsync(string userId)
        {
            // Check if user exists
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            await _userRepository.DeleteAsync(userId);
        }

        public async Task<UserResponseDto> AddServiceToUserAsync(string userId, string serviceName)
        {
            // Validate user exists
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            // Validate service exists by name
            var query = "SELECT * FROM c WHERE c.name = @name";
            var serviceList = await _serviceRepository.QueryAsync(query, new { name = serviceName });
            var service = serviceList.FirstOrDefault();
            if (service == null)
                throw new KeyNotFoundException($"Service with name '{serviceName}' not found");

            // Check if service is already linked
            if (user.LinkedServiceNames.Contains(serviceName))
                throw new InvalidOperationException($"Service '{serviceName}' is already linked to user {userId}");

            // Add service to user's linked services
            user.LinkedServiceNames.Add(serviceName);

            var updatedUser = await _userRepository.UpdateAsync(user);
            return MapToUserResponseDto(updatedUser);
        }

        public async Task<UserResponseDto> RemoveServiceFromUserAsync(string userId, string serviceName)
        {
            // Validate user exists
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            // Check if service is linked
            if (!user.LinkedServiceNames.Contains(serviceName))
                throw new InvalidOperationException($"Service '{serviceName}' is not linked to user {userId}");

            // Remove service from user's linked services
            user.LinkedServiceNames.Remove(serviceName);

            var updatedUser = await _userRepository.UpdateAsync(user);
            return MapToUserResponseDto(updatedUser);
        }

        public async Task<UserResponseDto> UpdateUserServicesAsync(string userId, List<string> serviceNames)
        {
            // Validate user exists
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            // Validate all services exist by name
            foreach (var serviceName in serviceNames)
            {
                var query = "SELECT * FROM c WHERE c.name = @name";
                var serviceList = await _serviceRepository.QueryAsync(query, new { name = serviceName });
                var service = serviceList.FirstOrDefault();
                if (service == null)
                    throw new KeyNotFoundException($"Service with name '{serviceName}' not found");
            }

            // Update user's linked services
            user.LinkedServiceNames = serviceNames;

            var updatedUser = await _userRepository.UpdateAsync(user);
            return MapToUserResponseDto(updatedUser);
        }

        private static UserResponseDto MapToUserResponseDto(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role,
                LinkedServiceNames = user.LinkedServiceNames ?? new List<string>(),
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }

        private static UserServiceDto MapToUserServiceDto(Infrastructure.Models.Service service)
        {
            return new UserServiceDto
            {
                Id = service.Id,
                Name = service.Name,
                Version = service.Version,
                Status = service.Status,
                AgentId = service.AgentId,
                CreatedAt = service.CreatedAt,
                UpdatedAt = service.UpdatedAt
            };
        }
    }
}

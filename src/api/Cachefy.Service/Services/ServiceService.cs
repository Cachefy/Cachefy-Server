using Cachefy.Infrastructure.Models;
using Cachefy.Infrastructure.Repositories;
using Cachefy.Service.DTOs;

namespace Cachefy.Service.Services
{
    public interface IServiceService
    {
        Task<IEnumerable<ServiceResponseDto>> GetAllServicesAsync();
        Task<IEnumerable<ServiceResponseDto>> GetServicesForUserAsync(string userId);
        Task<ServiceResponseDto> GetServiceByIdAsync(string id);
        Task<ServiceResponseDto> GetServiceByIdForUserAsync(string id, string userId);
        Task<ServiceResponseDto?> GetServiceByNameAsync(string name);
        Task<ServiceResponseDto> CreateServiceAsync(CreateServiceDto createServiceDto);
        Task<ServiceResponseDto> RegisterOrUpdateServiceAsync(CreateServiceDto createServiceDto);
        Task<ServiceResponseDto> UpdateServiceAsync(string id, UpdateServiceDto updateServiceDto);
        Task DeleteServiceAsync(string id);
    }

    public class ServiceService : IServiceService
    {
        private readonly IRepository<Infrastructure.Models.Service> _serviceRepository;
        private readonly IRepository<User> _userRepository;

        public ServiceService(
            IRepository<Infrastructure.Models.Service> serviceRepository,
            IRepository<User> userRepository)
        {
            _serviceRepository = serviceRepository;
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<ServiceResponseDto>> GetAllServicesAsync()
        {
            var services = await _serviceRepository.GetAllAsync();
            return services.Select(MapToResponseDto);
        }

        public async Task<IEnumerable<ServiceResponseDto>> GetServicesForUserAsync(string userId)
        {
            // Get the user to access their linked service names
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            // If user has no linked services, return empty list
            if (user.LinkedServiceNames == null || !user.LinkedServiceNames.Any())
                return new List<ServiceResponseDto>();

            // Get all services and filter by user's linked service names
            var allServices = await _serviceRepository.GetAllAsync();
            var userServices = allServices
                .Where(s => user.LinkedServiceNames.Contains(s.Name))
                .Select(MapToResponseDto);

            return userServices;
        }

        public async Task<ServiceResponseDto> GetServiceByIdAsync(string id)
        {
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {id} not found");
                
            return MapToResponseDto(service);
        }

        public async Task<ServiceResponseDto> GetServiceByIdForUserAsync(string id, string userId)
        {
            // Get the user to check permissions
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"User with ID {userId} not found");

            // Get the service
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {id} not found");

            // Check if user has access to this service by name
            if (user.LinkedServiceNames == null || !user.LinkedServiceNames.Contains(service.Name))
                throw new UnauthorizedAccessException($"User does not have access to service with ID {id}");

            return MapToResponseDto(service);
        }

        public async Task<ServiceResponseDto?> GetServiceByNameAsync(string name)
        {
            var query = "SELECT * FROM c WHERE c.name = @name";
            var services = await _serviceRepository.QueryAsync(query, new { name });
            var service = services.FirstOrDefault();
            
            return service != null ? MapToResponseDto(service) : null;
        }

        public async Task<ServiceResponseDto> CreateServiceAsync(CreateServiceDto createServiceDto)
        {
            var service = new Infrastructure.Models.Service
            {
                Name = createServiceDto.Name,
                Status = createServiceDto.Status,
                Version = createServiceDto.Version,
                AgentId = createServiceDto.AgentId
            };

            var createdService = await _serviceRepository.CreateAsync(service);
            return MapToResponseDto(createdService);
        }

        public async Task<ServiceResponseDto> RegisterOrUpdateServiceAsync(CreateServiceDto createServiceDto)
        {
            // Check if service with the same name already exists
            var existingService = await GetServiceByNameAsync(createServiceDto.Name);

            if (existingService != null)
            {
                // Service exists, update the UpdatedAt timestamp
                var updateDto = new UpdateServiceDto
                {
                    Name = createServiceDto.Name,
                    Status = createServiceDto.Status,
                    Version = createServiceDto.Version,
                    AgentId = createServiceDto.AgentId
                };

                return await UpdateServiceAsync(existingService.Id, updateDto);
            }
            else
            {
                // Create new service
                return await CreateServiceAsync(createServiceDto);
            }
        }

        public async Task<ServiceResponseDto> UpdateServiceAsync(string id, UpdateServiceDto updateServiceDto)
        {
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {id} not found");

            if (!string.IsNullOrEmpty(updateServiceDto.Name))
                service.Name = updateServiceDto.Name;
                
            if (!string.IsNullOrEmpty(updateServiceDto.Version))
                service.Version = updateServiceDto.Version;
                
            if (!string.IsNullOrEmpty(updateServiceDto.Status))
                service.Status = updateServiceDto.Status;
                
            if (updateServiceDto.AgentId != null)
                service.AgentId = updateServiceDto.AgentId;

            var updatedService = await _serviceRepository.UpdateAsync(service);
            return MapToResponseDto(updatedService);
        }

        public async Task DeleteServiceAsync(string id)
        {
            await _serviceRepository.DeleteAsync(id);
        }

        private static ServiceResponseDto MapToResponseDto(Infrastructure.Models.Service service)
        {
            return new ServiceResponseDto
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

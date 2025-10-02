using VolatixServer.Infrastructure.Models;
using VolatixServer.Infrastructure.Repositories;
using VolatixServer.Service.DTOs;

namespace VolatixServer.Service.Services
{
    public interface IServiceService
    {
        Task<IEnumerable<ServiceResponseDto>> GetAllServicesAsync();
        Task<ServiceResponseDto> GetServiceByIdAsync(string id);
        Task<ServiceResponseDto> CreateServiceAsync(CreateServiceDto createServiceDto);
        Task<ServiceResponseDto> UpdateServiceAsync(string id, UpdateServiceDto updateServiceDto);
        Task DeleteServiceAsync(string id);
    }

    public class ServiceService : IServiceService
    {
        private readonly IRepository<Infrastructure.Models.Service> _serviceRepository;

        public ServiceService(IRepository<Infrastructure.Models.Service> serviceRepository)
        {
            _serviceRepository = serviceRepository;
        }

        public async Task<IEnumerable<ServiceResponseDto>> GetAllServicesAsync()
        {
            var services = await _serviceRepository.GetAllAsync();
            return services.Select(MapToResponseDto);
        }

        public async Task<ServiceResponseDto> GetServiceByIdAsync(string id)
        {
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {id} not found");
                
            return MapToResponseDto(service);
        }

        public async Task<ServiceResponseDto> CreateServiceAsync(CreateServiceDto createServiceDto)
        {
            var service = new Infrastructure.Models.Service
            {
                Name = createServiceDto.Name,
                Description = createServiceDto.Description,
                Port = createServiceDto.Port,
                Status = createServiceDto.Status
            };

            var createdService = await _serviceRepository.CreateAsync(service);
            return MapToResponseDto(createdService);
        }

        public async Task<ServiceResponseDto> UpdateServiceAsync(string id, UpdateServiceDto updateServiceDto)
        {
            var service = await _serviceRepository.GetByIdAsync(id);
            if (service == null)
                throw new KeyNotFoundException($"Service with ID {id} not found");

            if (!string.IsNullOrEmpty(updateServiceDto.Name))
                service.Name = updateServiceDto.Name;
                
            if (!string.IsNullOrEmpty(updateServiceDto.Description))
                service.Description = updateServiceDto.Description;
                
            if (updateServiceDto.Port.HasValue)
                service.Port = updateServiceDto.Port.Value;
                
            if (!string.IsNullOrEmpty(updateServiceDto.Status))
                service.Status = updateServiceDto.Status;

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
                Description = service.Description,
                Port = service.Port,
                Status = service.Status,
                CreatedAt = service.CreatedAt,
                UpdatedAt = service.UpdatedAt
            };
        }
    }
}

using Cachefy.Infrastructure.Models;
using Cachefy.Infrastructure.Configuration;

namespace Cachefy.Infrastructure.Services
{
    public interface IContainerMappingService
    {
        string GetContainerName<T>() where T : BaseEntity;
        string GetContainerName(Type entityType);
        Dictionary<string, ContainerConfiguration> GetDefaultContainerConfigurations();
    }

    public class ContainerMappingService : IContainerMappingService
    {
        private readonly Dictionary<Type, string> _containerMappings;

        public ContainerMappingService()
        {
            _containerMappings = new Dictionary<Type, string>
            {
                { typeof(User), "Users" },
                { typeof(Agent), "Agents" },
                { typeof(Service), "Services" },
            };
        }

        public string GetContainerName<T>() where T : BaseEntity
        {
            return GetContainerName(typeof(T));
        }

        public string GetContainerName(Type entityType)
        {
            return _containerMappings.TryGetValue(entityType, out var containerName) 
                ? containerName 
                : entityType.Name + "s"; // Default: pluralize the entity name
        }

        public Dictionary<string, ContainerConfiguration> GetDefaultContainerConfigurations()
        {
            var configurations = new Dictionary<string, ContainerConfiguration>();

            foreach (var mapping in _containerMappings)
            {
                var entityType = mapping.Key;
                var containerName = mapping.Value;

                configurations[entityType.Name] = new ContainerConfiguration
                {
                    ContainerName = containerName,
                    PartitionKeyPath = "/partitionKey",
                    Throughput = 400,
                    UseAutoscale = false,
                    MaxAutoscaleThroughput = 4000,
                    DefaultTimeToLive = -1
                };
            }

            return configurations;
        }
    }
}

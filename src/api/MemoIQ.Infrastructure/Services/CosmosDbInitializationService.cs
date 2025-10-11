using Microsoft.Azure.Cosmos;
using MemoIQ.Infrastructure.Configuration;

namespace MemoIQ.Infrastructure.Services
{
    public interface ICosmosDbInitializationService
    {
        Task InitializeAsync();
    }

    public class CosmosDbInitializationService : ICosmosDbInitializationService
    {
        private readonly CosmosClient _cosmosClient;
        private readonly CosmosDbSettings _cosmosDbSettings;
        private readonly IContainerMappingService _containerMappingService;

        public CosmosDbInitializationService(
            CosmosClient cosmosClient, 
            CosmosDbSettings cosmosDbSettings,
            IContainerMappingService containerMappingService)
        {
            _cosmosClient = cosmosClient;
            _cosmosDbSettings = cosmosDbSettings;
            _containerMappingService = containerMappingService;
        }

        public async Task InitializeAsync()
        {
            try
            {
                // Determine throughput properties for database
                ThroughputProperties? databaseThroughput = null;
                if (_cosmosDbSettings.DatabaseThroughput.HasValue)
                {
                    databaseThroughput = _cosmosDbSettings.UseAutoscale && _cosmosDbSettings.MaxAutoscaleThroughput.HasValue
                        ? ThroughputProperties.CreateAutoscaleThroughput(_cosmosDbSettings.MaxAutoscaleThroughput.Value)
                        : ThroughputProperties.CreateManualThroughput(_cosmosDbSettings.DatabaseThroughput.Value);
                }

                // Create database if it doesn't exist
                var databaseResponse = await _cosmosClient.CreateDatabaseIfNotExistsAsync(
                    _cosmosDbSettings.DatabaseName,
                    throughputProperties: databaseThroughput
                );

                var database = databaseResponse.Database;

                Console.WriteLine($"Database '{_cosmosDbSettings.DatabaseName}' initialized successfully.");
                
                if (databaseResponse.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    Console.WriteLine($"Created new database: {_cosmosDbSettings.DatabaseName}");
                }

                // Get container configurations (from appsettings or default)
                var containerConfigurations = _cosmosDbSettings.Containers?.Any() == true 
                    ? _cosmosDbSettings.Containers 
                    : _containerMappingService.GetDefaultContainerConfigurations();

                // Create each container
                foreach (var config in containerConfigurations)
                {
                    var entityTypeName = config.Key;
                    var containerConfig = config.Value;

                    await CreateContainerAsync(database, containerConfig, entityTypeName);
                }

                // Backward compatibility: create the single container if specified
                if (!string.IsNullOrEmpty(_cosmosDbSettings.ContainerName) && 
                    !containerConfigurations.Values.Any(c => c.ContainerName == _cosmosDbSettings.ContainerName))
                {
                    var fallbackConfig = new ContainerConfiguration
                    {
                        ContainerName = _cosmosDbSettings.ContainerName,
                        PartitionKeyPath = "/partitionKey",
                        Throughput = _cosmosDbSettings.ContainerThroughput,
                        UseAutoscale = _cosmosDbSettings.UseAutoscale,
                        MaxAutoscaleThroughput = _cosmosDbSettings.MaxAutoscaleThroughput,
                        DefaultTimeToLive = -1
                    };

                    await CreateContainerAsync(database, fallbackConfig, "Legacy");
                }
            }
            catch (CosmosException ex)
            {
                Console.WriteLine($"Error initializing Cosmos DB: {ex.Message}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Unexpected error initializing Cosmos DB: {ex.Message}");
                throw;
            }
        }

        private async Task CreateContainerAsync(Database database, ContainerConfiguration config, string entityTypeName)
        {
            try
            {
                // Create container properties
                var containerProperties = new ContainerProperties
                {
                    Id = config.ContainerName,
                    PartitionKeyPath = config.PartitionKeyPath,
                    DefaultTimeToLive = config.DefaultTimeToLive
                };

                // Configure indexing policy for better performance
                containerProperties.IndexingPolicy.IndexingMode = IndexingMode.Consistent;
                containerProperties.IndexingPolicy.Automatic = true;
                containerProperties.IndexingPolicy.IncludedPaths.Add(new IncludedPath { Path = "/*" });

                // Determine throughput properties for container
                ThroughputProperties? containerThroughput = null;
                if (config.Throughput.HasValue)
                {
                    containerThroughput = config.UseAutoscale && config.MaxAutoscaleThroughput.HasValue
                        ? ThroughputProperties.CreateAutoscaleThroughput(config.MaxAutoscaleThroughput.Value)
                        : ThroughputProperties.CreateManualThroughput(config.Throughput.Value);
                }

                var containerResponse = await database.CreateContainerIfNotExistsAsync(
                    containerProperties,
                    throughputProperties: containerThroughput
                );

                Console.WriteLine($"Container '{config.ContainerName}' for {entityTypeName} initialized successfully.");

                if (containerResponse.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    Console.WriteLine($"Created new container: {config.ContainerName} (Entity: {entityTypeName})");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating container '{config.ContainerName}' for {entityTypeName}: {ex.Message}");
                throw;
            }
        }
    }
}

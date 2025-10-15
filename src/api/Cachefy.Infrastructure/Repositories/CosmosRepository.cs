using Microsoft.Azure.Cosmos;
using Cachefy.Infrastructure.Models;
using Cachefy.Infrastructure.Services;

namespace Cachefy.Infrastructure.Repositories
{
    public class CosmosRepository<T> : IRepository<T> where T : BaseEntity
    {
        private readonly Container _container;
        private readonly CosmosClient _cosmosClient;
        private readonly string _databaseName;
        private readonly string _containerName;
        
        public CosmosRepository(CosmosClient cosmosClient, string databaseName, IContainerMappingService containerMappingService)
        {
            _cosmosClient = cosmosClient;
            _databaseName = databaseName;
            _containerName = containerMappingService.GetContainerName<T>();
            _container = cosmosClient.GetContainer(databaseName, _containerName);
        }

        // Backward compatibility constructor
        public CosmosRepository(CosmosClient cosmosClient, string databaseName, string containerName)
        {
            _cosmosClient = cosmosClient;
            _databaseName = databaseName;
            _containerName = containerName;
            _container = cosmosClient.GetContainer(databaseName, containerName);
        }

        public async Task<IEnumerable<T>> GetAllAsync()
        {
            try
            {
                var query = _container.GetItemQueryIterator<T>(
                    new QueryDefinition("SELECT * FROM c"));
                
                var results = new List<T>();
                
                while (query.HasMoreResults)
                {
                    var response = await query.ReadNextAsync();
                    results.AddRange(response);
                }
                
                return results;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Error retrieving all items: {ex.Message}", ex);
            }
        }

        public async Task<T> GetByIdAsync(string id)
        {
            try
            {
                // Create a dummy instance to get the correct partition key
                var dummyInstance = Activator.CreateInstance<T>();
                var partitionKeyValue = dummyInstance.PartitionKey;
                
                var response = await _container.ReadItemAsync<T>(id, new PartitionKey(partitionKeyValue));
                return response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null!; // Returning null when item is not found - callers should handle null checks
            }
        }

        public async Task<T> CreateAsync(T entity)
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.CreateItemAsync(entity, new PartitionKey(entity.PartitionKey));
            return response.Resource;
        }

        public async Task<T> UpdateAsync(T entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            
            var response = await _container.UpsertItemAsync(entity, new PartitionKey(entity.PartitionKey));
            return response.Resource;
        }

        public async Task DeleteAsync(string id)
        {
            // Create a dummy instance to get the correct partition key
            var dummyInstance = Activator.CreateInstance<T>();
            var partitionKeyValue = dummyInstance.PartitionKey;
            
            await _container.DeleteItemAsync<T>(id, new PartitionKey(partitionKeyValue));
        }

        public async Task<IEnumerable<T>> QueryAsync(string query)
        {
            var queryDefinition = new QueryDefinition(query);
            var queryIterator = _container.GetItemQueryIterator<T>(queryDefinition);
            
            var results = new List<T>();
            
            while (queryIterator.HasMoreResults)
            {
                var response = await queryIterator.ReadNextAsync();
                results.AddRange(response);
            }
            
            return results;
        }

        public async Task<IEnumerable<T>> QueryAsync(string query, object parameters)
        {
            var queryDefinition = new QueryDefinition(query);
            
            // Add parameters using reflection
            if (parameters != null)
            {
                var properties = parameters.GetType().GetProperties();
                foreach (var property in properties)
                {
                    queryDefinition.WithParameter($"@{property.Name.ToLower()}", property.GetValue(parameters));
                }
            }

            var queryIterator = _container.GetItemQueryIterator<T>(queryDefinition);
            
            var results = new List<T>();
            
            while (queryIterator.HasMoreResults)
            {
                var response = await queryIterator.ReadNextAsync();
                results.AddRange(response);
            }
            
            return results;
        }
    }
}

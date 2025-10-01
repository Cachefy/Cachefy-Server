using Microsoft.Azure.Cosmos;
using VolatixServer.Infrastructure.Models;

namespace VolatixServer.Infrastructure.Repositories
{
    public class CosmosRepository<T> : IRepository<T> where T : BaseEntity
    {
        private readonly Container _container;
        
        public CosmosRepository(CosmosClient cosmosClient, string databaseName, string containerName)
        {
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
                var response = await _container.ReadItemAsync<T>(id, new PartitionKey(typeof(T).Name.ToLower() + "s"));
                return response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
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
            await _container.DeleteItemAsync<T>(id, new PartitionKey(typeof(T).Name.ToLower() + "s"));
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
    }
}

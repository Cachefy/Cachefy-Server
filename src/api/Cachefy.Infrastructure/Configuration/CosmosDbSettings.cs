namespace Cachefy.Infrastructure.Configuration
{
    public class CosmosDbSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string ContainerName { get; set; } = string.Empty; // Kept for backward compatibility
        public int? DatabaseThroughput { get; set; } = 400;
        public int? ContainerThroughput { get; set; } = 400;
        public bool UseAutoscale { get; set; } = false;
        public int? MaxAutoscaleThroughput { get; set; } = 4000;
        public Dictionary<string, ContainerConfiguration> Containers { get; set; } = new();
    }

    public class ContainerConfiguration
    {
        public string ContainerName { get; set; } = string.Empty;
        public string PartitionKeyPath { get; set; } = "/partitionKey";
        public int? Throughput { get; set; }
        public bool UseAutoscale { get; set; } = false;
        public int? MaxAutoscaleThroughput { get; set; }
        public int? DefaultTimeToLive { get; set; } = -1; // -1 means no TTL
    }
}

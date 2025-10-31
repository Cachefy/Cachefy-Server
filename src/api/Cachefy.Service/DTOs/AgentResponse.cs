namespace Cachefy.Service.DTOs
{
    public class AgentResponse
    {
        public string Id { get; set; }
        public List<ParametersDetails> ParametersDetails { get; set; } = null!;
        public IEnumerable<object> CacheKeys { get; set; } = null!;
        public object CacheResult { get; set; } = null!;
    }

    public class ParametersDetails
    {
        public string Name { get; set; } = null!;
        public Dictionary<string, string> Parameters { get; set; } = null!;
    }
}

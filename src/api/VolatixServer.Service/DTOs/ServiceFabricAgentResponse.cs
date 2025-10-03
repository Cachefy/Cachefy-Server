namespace VolatixServer.Service.DTOs
{
    public class ServiceFabricAgentResponse
    {
        public string ServiceName { get; set; }
        
        public int StatusCode { get; set; }
        
        public string Message { get; set; }
        
        public Dictionary<string, string> Parameters { get; set; }

        public List<string> CacheKeys { get; set; }

        public object CacheResult { get; set; }
    }
}

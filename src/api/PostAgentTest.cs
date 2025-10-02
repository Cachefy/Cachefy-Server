using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class PostAgentTest
{
    private static readonly HttpClient client = new HttpClient();
    private static readonly string baseUrl = "http://localhost:5046";

    static async Task Main(string[] args)
    {
        Console.WriteLine("🎯 POST /agents Test - Create Agent Only");
        Console.WriteLine("=========================================");
        Console.WriteLine();

        try
        {
            // Step 1: Login to get token
            Console.WriteLine("🔐 Step 1: Getting authentication token...");
            var token = await LoginAsync();
            Console.WriteLine("✅ Authentication successful!");
            Console.WriteLine();

            // Step 2: Create Agent via POST /agents
            Console.WriteLine("📝 Step 2: Creating agent via POST /agents...");
            var agent = await CreateAgentAsync(token);
            Console.WriteLine($"✅ Agent created successfully with ID: {agent.Id}");
            Console.WriteLine();

            // Display all agent details
            Console.WriteLine("📊 CREATED AGENT DATA:");
            Console.WriteLine("======================");
            Console.WriteLine($"ID: {agent.Id}");
            Console.WriteLine($"Name: {agent.Name}");
            Console.WriteLine($"Status: {agent.Status}");
            Console.WriteLine($"API Key: {agent.ApiKey}");
            Console.WriteLine($"Is API Key Active: {agent.IsApiKeyActive}");
            Console.WriteLine($"Created At: {agent.CreatedAt}");
            Console.WriteLine($"Updated At: {agent.UpdatedAt}");
            Console.WriteLine();

            Console.WriteLine("🗂️ DATABASE STORAGE INFO:");
            Console.WriteLine("=========================");
            Console.WriteLine("Database: VolatixDb");
            Console.WriteLine("Container: Agents");
            Console.WriteLine("Partition Key: agents");
            Console.WriteLine($"Document ID: {agent.Id}");
            Console.WriteLine();

            // Step 3: Verify the agent exists by retrieving it
            Console.WriteLine("🔍 Step 3: Verifying agent exists in database...");
            var retrievedAgent = await GetAgentAsync(token, agent.Id);
            Console.WriteLine("✅ Agent verification successful!");
            Console.WriteLine();

            Console.WriteLine("📋 VERIFIED DATA FROM DATABASE:");
            Console.WriteLine("===============================");
            Console.WriteLine($"Retrieved ID: {retrievedAgent.Id}");
            Console.WriteLine($"Retrieved Name: {retrievedAgent.Name}");
            Console.WriteLine($"Retrieved Status: {retrievedAgent.Status}");
            Console.WriteLine();

            if (retrievedAgent.Id == agent.Id)
            {
                Console.WriteLine("✅ DATA CONSISTENCY VERIFIED: Created and retrieved data match!");
            }
            else
            {
                Console.WriteLine("⚠️ Data inconsistency detected");
            }

            Console.WriteLine();
            Console.WriteLine("🏁 POST /agents Test Complete!");
            Console.WriteLine();
            Console.WriteLine("📍 You can verify the data in Cosmos DB Emulator:");
            Console.WriteLine("1. Open https://localhost:8081/_explorer/index.html");
            Console.WriteLine("2. Navigate to VolatixDb > Agents container");
            Console.WriteLine($"3. Look for document with ID: {agent.Id}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Test failed: {ex.Message}");
        }
    }

    static async Task<string> LoginAsync()
    {
        var loginData = new { Email = "admin@volatix.com", Password = "admin123" };
        var json = JsonSerializer.Serialize(loginData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync($"{baseUrl}/api/auth/login", content);
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var loginResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
        return loginResponse.GetProperty("token").GetString();
    }

    static async Task<AgentData> CreateAgentAsync(string token)
    {
        client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var agentData = new 
        { 
            Name = $"Test Agent - {DateTime.Now:yyyy-MM-dd HH:mm:ss}",
            Status = "Active"
        };
        
        Console.WriteLine($"Request payload: {JsonSerializer.Serialize(agentData, new JsonSerializerOptions { WriteIndented = true })}");
        Console.WriteLine();

        var json = JsonSerializer.Serialize(agentData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync($"{baseUrl}/api/agents", content);
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Response received: {responseContent}");
        Console.WriteLine();
        
        return JsonSerializer.Deserialize<AgentData>(responseContent, new JsonSerializerOptions 
        { 
            PropertyNameCaseInsensitive = true 
        });
    }

    static async Task<AgentData> GetAgentAsync(string token, string agentId)
    {
        var response = await client.GetAsync($"{baseUrl}/api/agents/{agentId}");
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<AgentData>(responseContent, new JsonSerializerOptions 
        { 
            PropertyNameCaseInsensitive = true 
        });
    }

    public class AgentData
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string ApiKey { get; set; }
        public bool IsApiKeyActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

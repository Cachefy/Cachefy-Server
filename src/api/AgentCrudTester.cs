using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class AgentCrudTester
{
    private static readonly HttpClient client = new HttpClient();
    private static readonly string baseUrl = "http://localhost:5046";
    private static string authToken = "";

    static async Task Main(string[] args)
    {
        Console.WriteLine("🚀 Starting Agent CRUD API Test");
        Console.WriteLine("================================");

        try
        {
            // Step 1: Login
            await LoginAsync();
            
            // Step 2: Create Agent
            var agentId = await CreateAgentAsync();
            
            // Step 3: Get All Agents
            await GetAllAgentsAsync();
            
            // Step 4: Get Single Agent
            await GetSingleAgentAsync(agentId);
            
            // Step 5: Update Agent
            await UpdateAgentAsync(agentId);
            
            // Step 6: Delete Agent
            await DeleteAgentAsync(agentId);
            
            Console.WriteLine("\n🎉 All tests completed successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n❌ Test failed: {ex.Message}");
        }
    }

    static async Task LoginAsync()
    {
        Console.WriteLine("\n🔐 Testing Login...");
        
        var loginData = new
        {
            Email = "admin@volatix.com",
            Password = "admin123"
        };
        
        var json = JsonSerializer.Serialize(loginData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync($"{baseUrl}/api/auth/login", content);
        
        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var loginResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
            authToken = loginResponse.GetProperty("token").GetString();
            
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authToken);
            
            Console.WriteLine("✅ Login successful");
        }
        else
        {
            throw new Exception($"Login failed: {response.StatusCode}");
        }
    }
    
    static async Task<string> CreateAgentAsync()
    {
        Console.WriteLine("\n📝 Testing Create Agent...");
        
        var agentData = new
        {
            Name = $"Test Agent - {DateTime.Now:HH:mm:ss}"
        };
        
        var json = JsonSerializer.Serialize(agentData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync($"{baseUrl}/api/agents", content);
        
        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var agentResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
            var agentId = agentResponse.GetProperty("id").GetString();
            
            Console.WriteLine($"✅ Agent created with ID: {agentId}");
            return agentId;
        }
        else
        {
            throw new Exception($"Create agent failed: {response.StatusCode}");
        }
    }
    
    static async Task GetAllAgentsAsync()
    {
        Console.WriteLine("\n📋 Testing Get All Agents...");
        
        var response = await client.GetAsync($"{baseUrl}/api/agents");
        
        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var agents = JsonSerializer.Deserialize<JsonElement[]>(responseContent);
            
            Console.WriteLine($"✅ Retrieved {agents.Length} agents");
        }
        else
        {
            throw new Exception($"Get all agents failed: {response.StatusCode}");
        }
    }
    
    static async Task GetSingleAgentAsync(string agentId)
    {
        Console.WriteLine($"\n🔍 Testing Get Single Agent ({agentId})...");
        
        var response = await client.GetAsync($"{baseUrl}/api/agents/{agentId}");
        
        if (response.IsSuccessStatusCode)
        {
            Console.WriteLine("✅ Single agent retrieved successfully");
        }
        else
        {
            throw new Exception($"Get single agent failed: {response.StatusCode}");
        }
    }
    
    static async Task UpdateAgentAsync(string agentId)
    {
        Console.WriteLine($"\n✏️ Testing Update Agent ({agentId})...");
        
        var updateData = new
        {
            Name = $"Updated Agent - {DateTime.Now:HH:mm:ss}",
            Status = "Inactive"
        };
        
        var json = JsonSerializer.Serialize(updateData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PutAsync($"{baseUrl}/api/agents/{agentId}", content);
        
        if (response.IsSuccessStatusCode)
        {
            Console.WriteLine("✅ Agent updated successfully");
        }
        else
        {
            throw new Exception($"Update agent failed: {response.StatusCode}");
        }
    }
    
    static async Task DeleteAgentAsync(string agentId)
    {
        Console.WriteLine($"\n🗑️ Testing Delete Agent ({agentId})...");
        
        var response = await client.DeleteAsync($"{baseUrl}/api/agents/{agentId}");
        
        if (response.IsSuccessStatusCode)
        {
            Console.WriteLine("✅ Agent deleted successfully");
        }
        else
        {
            throw new Exception($"Delete agent failed: {response.StatusCode}");
        }
    }
}

using Microsoft.AspNetCore.Mvc;

namespace VolatixServer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Health check endpoint to verify API is running
    /// </summary>
    /// <returns>OK status with "pong" message</returns>
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok("pong");
    }
}

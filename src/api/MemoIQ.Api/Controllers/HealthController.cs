using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemoIQ.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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

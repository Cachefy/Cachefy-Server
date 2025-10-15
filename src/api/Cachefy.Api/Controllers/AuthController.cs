using Microsoft.AspNetCore.Mvc;
using Cachefy.Service.DTOs;
using Cachefy.Service.Services;

namespace Cachefy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto loginDto)
        {
            try
            {
                var result = await _authService.LoginAsync(loginDto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }
    }
}

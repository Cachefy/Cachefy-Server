using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Cachefy.Service.DTOs;
using Cachefy.Service.Services;

namespace Cachefy.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Get the current user's information
        /// </summary>
        [HttpGet("me")]
        public async Task<ActionResult<UserResponseDto>> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                var user = await _userService.GetUserByIdAsync(userId);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get all users (Admin only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        /// <summary>
        /// Get a user by ID (Admin only)
        /// </summary>
        [HttpGet("{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserResponseDto>> GetUserById(string userId)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(userId);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Create a new user (Admin only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserResponseDto>> CreateUser([FromBody] CreateUserDto createUserDto)
        {
            try
            {
                var user = await _userService.CreateUserAsync(createUserDto);
                return CreatedAtAction(nameof(GetUserById), new { userId = user.Id }, user);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing user (Admin only)
        /// </summary>
        [HttpPut("{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserResponseDto>> UpdateUser(string userId, [FromBody] UpdateUserDto updateUserDto)
        {
            try
            {
                var user = await _userService.UpdateUserAsync(userId, updateUserDto);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Delete a user (Admin only)
        /// </summary>
        [HttpDelete("{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteUser(string userId)
        {
            try
            {
                await _userService.DeleteUserAsync(userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Add a service to the current user's linked services
        /// </summary>
        [HttpPost("services")]
        public async Task<ActionResult<UserResponseDto>> AddServiceToUser([FromBody] AddServiceToUserDto dto)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                var user = await _userService.AddServiceToUserAsync(userId, dto.ServiceName);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Remove a service from the current user's linked services
        /// </summary>
        [HttpDelete("services/{serviceName}")]
        public async Task<ActionResult<UserResponseDto>> RemoveServiceFromUser(string serviceName)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                var user = await _userService.RemoveServiceFromUserAsync(userId, serviceName);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Update (replace) all services linked to the current user
        /// </summary>
        [HttpPut("services")]
        public async Task<ActionResult<UserResponseDto>> UpdateUserServices([FromBody] List<string> serviceNames)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                var user = await _userService.UpdateUserServicesAsync(userId, serviceNames);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}

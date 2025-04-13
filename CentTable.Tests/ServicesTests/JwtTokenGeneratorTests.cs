using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CentTable.Models;
using CentTable.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;

namespace CentTable.Tests.ServicesTests
{
    public class JwtTokenGeneratorTests
    {
        [Fact]
        public async Task GenerateTokenAsync_ReturnsValidJwtToken_WithExpectedClaims()
        {
            var inMemorySettings = new System.Collections.Generic.Dictionary<string, string>
            {
                {"Jwt:Key", "super_secret_key_that_is_at_least_32_chars!"},
                {"Jwt:TokenLifetimeDays", "1"},
                {"Jwt:Issuer", "TestIssuer"},
                {"Jwt:Audience", "TestAudience"}
            };
            IConfiguration configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            var userStoreMock = new Mock<IUserStore<ApplicationUser>>();
            var userManagerMock = new Mock<UserManager<ApplicationUser>>(
                userStoreMock.Object, null, null, null, null, null, null, null, null);
            userManagerMock.Setup(um => um.GetRolesAsync(It.IsAny<ApplicationUser>()))
                           .ReturnsAsync(new[] { "User" });

            var generator = new JwtTokenGenerator(configuration, userManagerMock.Object);
            var user = new ApplicationUser
            {
                Id = "user1",
                UserName = "testuser",
                Email = "test@example.com"
            };

            string token = await generator.GenerateTokenAsync(user);
            Assert.False(string.IsNullOrWhiteSpace(token));

            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(token);
            Assert.Equal("testuser", jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.UniqueName)?.Value);
            Assert.Equal("user1", jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value);
            Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "User");
            Assert.True(jwtToken.ValidTo > DateTime.UtcNow);
            Assert.True(jwtToken.ValidTo <= DateTime.UtcNow.AddDays(1.1));
        }
    }
}

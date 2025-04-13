using CentTable.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Xunit;

namespace CentTable.Tests.ExtensionsTests
{
    public class JwtServiceExtensionsTests
    {
        [Fact]
        public void ConfigureJwtAuthentication_AddsJwtBearerAuthentication()
        {
            var inMemorySettings = new System.Collections.Generic.Dictionary<string, string>
            {
                {"Jwt:Key", "test_key_12345"},
                {"Jwt:Issuer", "TestIssuer"},
                {"Jwt:Audience", "TestAudience"}
            };
            IConfiguration configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();
            var services = new ServiceCollection();

            services.ConfigureJwtAuthentication(configuration);
            var provider = services.BuildServiceProvider();
            var schemeProvider = provider.GetService<Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider>();

            var scheme = schemeProvider.GetSchemeAsync(JwtBearerDefaults.AuthenticationScheme).Result;
            Assert.NotNull(scheme);
        }
    }
}

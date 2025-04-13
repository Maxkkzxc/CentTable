using CentTable.Extensions;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Swashbuckle.AspNetCore.SwaggerGen;
using Xunit;

namespace CentTable.Tests.ExtensionsTests
{
    public class CorsAndSwaggerExtensionsTests
    {
        [Fact]
        public void ConfigureCors_AddsCorsPolicy()
        {
            var services = new ServiceCollection();
            services.AddCors(); 
            services.ConfigureCors();
            var provider = services.BuildServiceProvider();

            var options = provider.GetService<IOptions<CorsOptions>>();
            Assert.NotNull(options);
            var policy = options.Value.GetPolicy("AllowFrontend");
            Assert.NotNull(policy);
        }

        [Fact]
        public void ConfigureSwagger_AddsSwaggerServices()
        {
            var services = new ServiceCollection();
            services.AddSwaggerGen(); 
            services.ConfigureSwagger();
            var provider = services.BuildServiceProvider();

            var swaggerOptions = provider.GetService<IOptions<SwaggerGenOptions>>();
            Assert.NotNull(swaggerOptions);
        }
    }
}

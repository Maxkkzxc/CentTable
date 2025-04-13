using System.Threading.Tasks;
using CentTable.Data;
using CentTable.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace CentTable.Tests.ServicesTests
{
    public class DatabaseInitializerTests
    {
        [Fact]
        public async Task ApplyMigrationsAsync_WithInMemoryDb_ThrowsInvalidOperationException()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase("TestDb").Options;
            var context = new AppDbContext(options);
            var services = new ServiceCollection();
            services.AddSingleton(context);
            var provider = services.BuildServiceProvider();
            var appMock = new Mock<IApplicationBuilder>();
            appMock.Setup(a => a.ApplicationServices).Returns(provider);

            var exception = await Record.ExceptionAsync(() => DatabaseInitializer.ApplyMigrationsAsync(appMock.Object));
            Assert.IsType<InvalidOperationException>(exception);
            Assert.Contains("Relational-specific methods", exception.Message);
        }
    }
}

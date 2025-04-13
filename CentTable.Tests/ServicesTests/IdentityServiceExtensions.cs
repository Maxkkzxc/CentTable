using CentTable.Data;
using CentTable.Extensions;
using CentTable.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CentTable.Tests.ExtensionsTests
{
    public class IdentityServiceExtensionsTests
    {
        [Fact]
        public void ConfigureIdentity_RegistersIdentityServices()
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestDb"));
            services.ConfigureIdentity();
            var provider = services.BuildServiceProvider();

            var userManager = provider.GetService<UserManager<ApplicationUser>>();
            var roleManager = provider.GetService<RoleManager<IdentityRole>>();
            Assert.NotNull(userManager);
            Assert.NotNull(roleManager);
        }
    }
}

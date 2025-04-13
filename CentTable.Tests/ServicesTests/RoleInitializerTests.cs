using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using CentTable.Services;

namespace CentTable.Tests.ServicesTests
{
    public class RoleInitializerTests
    {
        [Fact]
        public async Task SeedRolesAsync_CreatesMissingRoles()
        {
            var roleStoreMock = new Mock<IRoleStore<IdentityRole>>();
            var roleManager = new RoleManager<IdentityRole>(
                roleStoreMock.Object,
                new IRoleValidator<IdentityRole>[] { new RoleValidator<IdentityRole>() },
                new UpperInvariantLookupNormalizer(),
                new IdentityErrorDescriber(),
                null);

            var roleManagerMock = new Mock<RoleManager<IdentityRole>>(
                roleStoreMock.Object,
                new IRoleValidator<IdentityRole>[] { new RoleValidator<IdentityRole>() },
                new UpperInvariantLookupNormalizer(),
                new IdentityErrorDescriber(),
                null);
            roleManagerMock.Setup(rm => rm.RoleExistsAsync(It.IsAny<string>()))
                           .ReturnsAsync(false);
            roleManagerMock.Setup(rm => rm.CreateAsync(It.IsAny<IdentityRole>()))
                           .ReturnsAsync(IdentityResult.Success);

            var services = new ServiceCollection();
            services.AddSingleton(roleManagerMock.Object);
            var provider = services.BuildServiceProvider();

            var appMock = new Mock<IApplicationBuilder>();
            appMock.Setup(a => a.ApplicationServices).Returns(provider);

            await RoleInitializer.SeedRolesAsync(appMock.Object);

            roleManagerMock.Verify(rm => rm.CreateAsync(It.Is<IdentityRole>(r => r.Name == "User")), Times.Once);
            roleManagerMock.Verify(rm => rm.CreateAsync(It.Is<IdentityRole>(r => r.Name == "Admin")), Times.Once);
        }
    }
}

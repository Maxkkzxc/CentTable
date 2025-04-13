using Microsoft.AspNetCore.SpaServices.StaticFiles;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using System.IO;
using System.Linq;
using Xunit;
using CentTable.Extensions;

namespace CentTable.Tests.ServicesTests
{
    public class SpaServiceExtensions_DirectRegistrationTests
    {
        [Fact]
        public void AddSpaStaticFiles_RegistersOptionsDescriptor()
        {
            var services = new ServiceCollection();
            services.AddOptions();
            services.AddSingleton<IWebHostEnvironment>(new FakeWebHostEnvironment());
            services.ConfigureSpa();
            var provider = services.BuildServiceProvider();

            var monitor = provider.GetService<IOptionsMonitor<SpaStaticFilesOptions>>();
            Assert.NotNull(monitor);
            var currentValue = monitor.CurrentValue;

            Assert.Equal("ClientApp/build", currentValue.RootPath);
        }
    }

    public class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "TestApp";
        public string WebRootPath { get; set; } = Directory.GetCurrentDirectory();
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; }
            = new PhysicalFileProvider(Directory.GetCurrentDirectory());
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; }
            = new PhysicalFileProvider(Directory.GetCurrentDirectory());
    }
}

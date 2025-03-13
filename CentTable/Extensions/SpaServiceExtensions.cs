using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.Extensions.DependencyInjection;

namespace CentTable.Extensions
{
    public static class SpaServiceExtensions
    {
        public static IServiceCollection ConfigureSpa(this IServiceCollection services)
        {
            services.AddSpaStaticFiles(configuration => configuration.RootPath = "ClientApp/build");
            return services;
        }

        public static void ConfigureSpa(this IApplicationBuilder app)
        {
            app.UseSpa(spa =>
            {
                spa.Options.SourcePath = "ClientApp";
                if (app.ApplicationServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
                {
                    spa.UseReactDevelopmentServer(npmScript: "start");
                }
            });
        }
    }
}

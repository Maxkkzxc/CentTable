using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using CentTable.Data;
using CentTable.Models;

namespace CentTable.Extensions
{
    public static class IdentityServiceExtensions
    {
        public static IServiceCollection ConfigureIdentity(this IServiceCollection services)
        {
            services.AddIdentity<ApplicationUser, IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>()
                .AddDefaultTokenProviders();

            return services;
        }
    }
}

using Microsoft.AspNetCore.Identity;

namespace CentTable.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string FullName => $"{FirstName} {LastName}".Trim();
        public DateTime? DateOfBirth { get; set; }
    }
}

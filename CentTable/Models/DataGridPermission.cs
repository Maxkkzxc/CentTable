

using CentTable.Models.CentTable.Models;

namespace CentTable.Models
{
    public class DataGridPermission
    {
        public int Id { get; set; }
        public int DataGridId { get; set; }
        public DataGrid DataGrid { get; set; }
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }
        public bool CanView { get; set; }
        public bool CanEdit { get; set; }
    }
}

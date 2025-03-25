namespace CentTable.Data
{
    public class UpdateDataGridPermissionsModel
    {
        public int DataGridId { get; set; }
        public List<DataGridPermissionModel> Permissions { get; set; }
    }

    public class DataGridPermissionModel
    {
        public string UserId { get; set; }
        public bool CanView { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }
}

namespace CentTable.Models
{
    public class UpdateCellRequest
    {
        public int GridId { get; set; }
        public int RowId { get; set; }
        public int ColumnId { get; set; }
        public string Value { get; set; }
    }
}

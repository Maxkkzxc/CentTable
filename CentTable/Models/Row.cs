namespace CentTable.Models
{
    public class Row
    {
        public int Id { get; set; }
        public int DataGridId { get; set; }
        public DataGrid DataGrid { get; set; }
        public ICollection<Cell> Cells { get; set; }
    }

}

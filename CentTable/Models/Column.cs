using CentTable.Enums;

namespace CentTable.Models
{
    public class Column
    {
        public int Id { get; set; }
        public int DataGridId { get; set; }
        public DataGrid DataGrid { get; set; }
        public string Name { get; set; }
        public ColumnType Type { get; set; } 
        public bool IsRequired { get; set; }
        public string ValidationRegex { get; set; }  
        public ICollection<Cell> Cells { get; set; }  
    }
}

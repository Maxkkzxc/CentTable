using System.Text.Json.Serialization;

namespace CentTable.Models
{
    public class Row
    {
        public int Id { get; set; }
        public int DataGridId { get; set; }

        [JsonIgnore]
        public DataGrid DataGrid { get; set; }

        public ICollection<Cell> Cells { get; set; }
    }
    public class BatchDeleteModel
    {
        public List<int> RowIds { get; set; }
    }
    public class BatchInsertModel
    {
        public int DataGridId { get; set; }
        public List<CopyRowModel> Rows { get; set; }
    }

    public class CopyRowModel
    {
        public List<CopyCellModel> Cells { get; set; }
    }

    public class CopyCellModel
    {
        public int ColumnId { get; set; }
        public string Value { get; set; }
    }
}
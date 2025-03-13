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
}
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CentTable.Enums;

namespace CentTable.Models
{
    public class Column
    {
        public int Id { get; set; }
        public int DataGridId { get; set; }

        [JsonIgnore]
        public DataGrid DataGrid { get; set; }
        public string Name { get; set; }
        public ColumnType Type { get; set; }
        public string ValidationRegex { get; set; }
        public string Options { get; set; }
        public int? MaxLength { get; set; }
        public double? MinValue { get; set; }
        public double? MaxValue { get; set; }

        [JsonIgnore]
        public ICollection<Cell> Cells { get; set; }
    }
}

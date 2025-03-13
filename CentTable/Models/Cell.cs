using System.Text.Json.Serialization;

namespace CentTable.Models
{
    public class Cell
    {
        public int Id { get; set; }
        public int RowId { get; set; }

        [JsonIgnore]
        public Row Row { get; set; }

        public int ColumnId { get; set; }

        [JsonIgnore]
        public Column Column { get; set; }

        public string? Value { get; set; }
    }
}

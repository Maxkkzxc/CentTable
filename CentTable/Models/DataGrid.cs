using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Components;

namespace CentTable.Models
{
    public class DataGrid
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsPublic { get; set; }
        public ICollection<Column> Columns { get; set; }
        public ICollection<Row> Rows { get; set; }
        public ICollection<DataGridPermission> Permissions { get; set; }
    }
}

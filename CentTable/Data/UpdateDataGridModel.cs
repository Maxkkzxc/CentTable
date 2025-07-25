using System.ComponentModel.DataAnnotations;
using CentTable.Enums;

namespace CentTable.ViewModels
{
    public class UpdateDataGridModel
    {
        public string Name { get; set; }
        public bool IsPublic { get; set; }
        public List<UpdateColumnModel>? Columns { get; set; }
        public List<UpdateRowModel>? Rows { get; set; }
    }

    public class UpdateColumnModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public ColumnType Type { get; set; }
        public string ValidationRegex { get; set; }
        public string Options { get; set; }
        public int? MaxLength { get; set; }
        public double? MinValue { get; set; }
        public double? MaxValue { get; set; }
        public int? LinkedGridId { get; set; }
        public int? LinkedColumnId { get; set; }
    }

    public class UpdateRowModel
    {
        public int Id { get; set; }
        public List<UpdateCellModel> Cells { get; set; }
    }

    public class UpdateCellModel
    {
        public int ColumnId { get; set; }
        public object Value { get; set; }
    }
}
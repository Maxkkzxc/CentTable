using System.Collections.Generic;
using CentTable.Enums;

namespace CentTable.Data
{
    public class CreateDataGridModel
    {
        public string Name { get; set; }
        public bool IsPublic { get; set; }
        public List<CreateColumnModel> Columns { get; set; }
    }

    public class CreateColumnModel
    {
        public string Name { get; set; }
        public ColumnType Type { get; set; }
        public string ValidationRegex { get; set; }
        public string Options { get; set; }
        public string ExternalTable { get; set; }
        public string ExternalColumn { get; set; }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentTable.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDataGridModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalColumn",
                table: "Columns",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalTable",
                table: "Columns",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExternalColumn",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "ExternalTable",
                table: "Columns");
        }
    }
}

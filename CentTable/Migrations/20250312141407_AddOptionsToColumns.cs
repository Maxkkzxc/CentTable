using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentTable.Migrations
{
    /// <inheritdoc />
    public partial class AddOptionsToColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Options",
                table: "Columns",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Options",
                table: "Columns");
        }
    }
}

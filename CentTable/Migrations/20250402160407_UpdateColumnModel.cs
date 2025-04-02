using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentTable.Migrations
{
    /// <inheritdoc />
    public partial class UpdateColumnModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxLength",
                table: "Columns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "MaxValue",
                table: "Columns",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "MinValue",
                table: "Columns",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxLength",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "MaxValue",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "MinValue",
                table: "Columns");
        }
    }
}

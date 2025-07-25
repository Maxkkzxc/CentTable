using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentTable.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalAndReverseLinksToColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LinkedColumnId",
                table: "Columns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LinkedGridId",
                table: "Columns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceColumnId",
                table: "Columns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceGridId",
                table: "Columns",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LinkedColumnId",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "LinkedGridId",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "SourceColumnId",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "SourceGridId",
                table: "Columns");
        }
    }
}

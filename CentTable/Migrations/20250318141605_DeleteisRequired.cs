using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentTable.Migrations
{
    /// <inheritdoc />
    public partial class DeleteisRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRequired",
                table: "Columns");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRequired",
                table: "Columns",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}

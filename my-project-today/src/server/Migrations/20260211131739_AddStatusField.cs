using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "MeetingRequests",
                type: "TEXT",
                nullable: false,
                defaultValue: "Draft");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "MeetingRequests");
        }
    }
}

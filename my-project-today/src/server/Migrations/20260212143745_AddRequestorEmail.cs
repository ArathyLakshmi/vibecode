using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestorEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RequestorEmail",
                table: "MeetingRequests",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequestorEmail",
                table: "MeetingRequests");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    public partial class AddReferenceNumber : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferenceNumber",
                table: "MeetingRequests",
                type: "TEXT",
                nullable: true);

            // Create an index to enforce uniqueness when values are present
            migrationBuilder.CreateIndex(
                name: "IX_MeetingRequests_ReferenceNumber",
                table: "MeetingRequests",
                column: "ReferenceNumber",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MeetingRequests_ReferenceNumber",
                table: "MeetingRequests");

            migrationBuilder.DropColumn(
                name: "ReferenceNumber",
                table: "MeetingRequests");
        }
    }
}

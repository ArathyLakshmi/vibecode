using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "MeetingRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "MeetingRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "MeetingRequests",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "MeetingRequests");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "MeetingRequests");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "MeetingRequests");
        }
    }
}

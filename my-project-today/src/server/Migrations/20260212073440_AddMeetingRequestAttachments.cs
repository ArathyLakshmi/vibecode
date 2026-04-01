using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingRequestAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MeetingRequestAttachments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MeetingRequestId = table.Column<int>(type: "INTEGER", nullable: false),
                    FileName = table.Column<string>(type: "TEXT", nullable: false),
                    StoredFileName = table.Column<string>(type: "TEXT", nullable: false),
                    FilePath = table.Column<string>(type: "TEXT", nullable: false),
                    FileSize = table.Column<long>(type: "INTEGER", nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", nullable: false),
                    UploadedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingRequestAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingRequestAttachments_MeetingRequests_MeetingRequestId",
                        column: x => x.MeetingRequestId,
                        principalTable: "MeetingRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRequestAttachments_MeetingRequestId",
                table: "MeetingRequestAttachments",
                column: "MeetingRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRequestAttachments_StoredFileName",
                table: "MeetingRequestAttachments",
                column: "StoredFileName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeetingRequestAttachments");
        }
    }
}

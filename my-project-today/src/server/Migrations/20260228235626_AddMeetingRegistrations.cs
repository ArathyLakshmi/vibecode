using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingRegistrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxAttendees",
                table: "MeetingRequests",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RegistrationDeadlineMinutes",
                table: "MeetingRequests",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MeetingRegistrations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MeetingRequestId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserEmail = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    UserName = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    RegistrationDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    WaitlistPosition = table.Column<int>(type: "INTEGER", nullable: true),
                    CancellationDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CancellationReason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingRegistrations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingRegistrations_MeetingRequests_MeetingRequestId",
                        column: x => x.MeetingRequestId,
                        principalTable: "MeetingRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRegistrations_MeetingRequestId",
                table: "MeetingRegistrations",
                column: "MeetingRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRegistrations_MeetingRequestId_UserEmail",
                table: "MeetingRegistrations",
                columns: new[] { "MeetingRequestId", "UserEmail" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRegistrations_Status",
                table: "MeetingRegistrations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRegistrations_UserEmail",
                table: "MeetingRegistrations",
                column: "UserEmail");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingRegistrations_WaitlistPosition",
                table: "MeetingRegistrations",
                column: "WaitlistPosition");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeetingRegistrations");

            migrationBuilder.DropColumn(
                name: "MaxAttendees",
                table: "MeetingRequests");

            migrationBuilder.DropColumn(
                name: "RegistrationDeadlineMinutes",
                table: "MeetingRequests");
        }
    }
}

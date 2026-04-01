using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingAgendas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MeetingAgendaItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MeetingRequestId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    OrderIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingAgendaItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingAgendaItems_MeetingRequests_MeetingRequestId",
                        column: x => x.MeetingRequestId,
                        principalTable: "MeetingRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingAgendas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MeetingRequestId = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingAgendas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingAgendas_MeetingRequests_MeetingRequestId",
                        column: x => x.MeetingRequestId,
                        principalTable: "MeetingRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingAgendaItems_MeetingRequestId",
                table: "MeetingAgendaItems",
                column: "MeetingRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingAgendaItems_MeetingRequestId_OrderIndex",
                table: "MeetingAgendaItems",
                columns: new[] { "MeetingRequestId", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingAgendas_MeetingRequestId",
                table: "MeetingAgendas",
                column: "MeetingRequestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeetingAgendaItems");

            migrationBuilder.DropTable(
                name: "MeetingAgendas");
        }
    }
}

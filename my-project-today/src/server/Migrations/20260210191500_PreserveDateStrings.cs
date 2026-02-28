using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VibeCode.Server.Migrations
{
    public partial class PreserveDateStrings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rebuild the MeetingRequests table while converting legacy string date values
            // into an ISO-like datetime text (YYYY-MM-DDTHH:MM:SS) so EF DateTime parsing
            // can pick them up. This preserves all rows and other columns.

            migrationBuilder.Sql(@"
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS MeetingRequests_temp (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    MeetingDate TEXT,
    AlternateDate TEXT,
    Category TEXT NOT NULL,
    Subcategory TEXT NOT NULL,
    Description TEXT NOT NULL,
    Comments TEXT NOT NULL,
    Classification TEXT NOT NULL,
    IsDraft INTEGER NOT NULL,
    CreatedAt TEXT NOT NULL
);

INSERT INTO MeetingRequests_temp (Id, Title, MeetingDate, AlternateDate, Category, Subcategory, Description, Comments, Classification, IsDraft, CreatedAt)
SELECT
    Id,
    Title,
    CASE
        WHEN MeetingDate IS NULL OR trim(MeetingDate) = '' THEN NULL
        WHEN length(MeetingDate) = 10 AND MeetingDate LIKE '____-__-__' THEN MeetingDate || 'T00:00:00'
        ELSE MeetingDate
    END AS MeetingDate,
    CASE
        WHEN AlternateDate IS NULL OR trim(AlternateDate) = '' THEN NULL
        WHEN length(AlternateDate) = 10 AND AlternateDate LIKE '____-__-__' THEN AlternateDate || 'T00:00:00'
        ELSE AlternateDate
    END AS AlternateDate,
    Category,
    Subcategory,
    Description,
    Comments,
    Classification,
    IsDraft,
    CreatedAt
FROM MeetingRequests;

DROP TABLE MeetingRequests;
ALTER TABLE MeetingRequests_temp RENAME TO MeetingRequests;

COMMIT;
PRAGMA foreign_keys=on;
" );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Down migration restores schema by rebuilding table without altering data types.
            migrationBuilder.Sql(@"
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS MeetingRequests_prev (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    MeetingDate TEXT,
    AlternateDate TEXT,
    Category TEXT NOT NULL,
    Subcategory TEXT NOT NULL,
    Description TEXT NOT NULL,
    Comments TEXT NOT NULL,
    Classification TEXT NOT NULL,
    IsDraft INTEGER NOT NULL,
    CreatedAt TEXT NOT NULL
);

INSERT INTO MeetingRequests_prev (Id, Title, MeetingDate, AlternateDate, Category, Subcategory, Description, Comments, Classification, IsDraft, CreatedAt)
SELECT Id, Title, MeetingDate, AlternateDate, Category, Subcategory, Description, Comments, Classification, IsDraft, CreatedAt FROM MeetingRequests;

DROP TABLE MeetingRequests;
ALTER TABLE MeetingRequests_prev RENAME TO MeetingRequests;

COMMIT;
PRAGMA foreign_keys=on;
" );
        }
    }
}

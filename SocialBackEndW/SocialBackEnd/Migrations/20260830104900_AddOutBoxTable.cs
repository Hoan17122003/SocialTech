using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddOutBoxTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OutBoxMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    AggregateType = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    AggregateId = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "longtext", nullable: false),
                    ProcessedOnUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    Error = table.Column<string>(type: "longtext", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutBoxMessages", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 8, 30, 10, 48, 59, 183, DateTimeKind.Utc).AddTicks(9526));

            migrationBuilder.CreateIndex(
                name: "IX_OutBoxMessages_AggregateType",
                table: "OutBoxMessages",
                column: "AggregateType");

            migrationBuilder.CreateIndex(
                name: "IX_OutBoxMessages_EventType",
                table: "OutBoxMessages",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_OutBoxMessages_ProcessedOnUtc_CreatedAtUtc",
                table: "OutBoxMessages",
                columns: new[] { "ProcessedOnUtc", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OutBoxMessages");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 7, 1, 9, 53, 17, 610, DateTimeKind.Utc).AddTicks(3454));
        }
    }
}

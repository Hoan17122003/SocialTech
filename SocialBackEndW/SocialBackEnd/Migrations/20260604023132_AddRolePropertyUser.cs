using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddRolePropertyUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 6, 4, 2, 31, 32, 517, DateTimeKind.Utc).AddTicks(3407));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 6, 1, 8, 50, 49, 448, DateTimeKind.Utc).AddTicks(5649));
        }
    }
}

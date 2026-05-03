using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class UpdateIpLoginConfig1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "RefreshToken",
                table: "IPlogin",
                type: "varchar(1024)",
                maxLength: 1024,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(512)",
                oldMaxLength: 512);

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 5, 2, 11, 23, 52, 147, DateTimeKind.Utc).AddTicks(8332));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "RefreshToken",
                table: "IPlogin",
                type: "varchar(512)",
                maxLength: 512,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(1024)",
                oldMaxLength: 1024);

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 5, 2, 11, 22, 28, 246, DateTimeKind.Utc).AddTicks(4179));
        }
    }
}

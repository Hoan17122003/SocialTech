using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class RedesignChatConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasCustomTitle",
                table: "ChatConversations",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "PublicId",
                table: "ChatConversations",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql("UPDATE ChatConversations SET PublicId = UUID() WHERE PublicId = '00000000-0000-0000-0000-000000000000'");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 7, 1, 9, 53, 17, 610, DateTimeKind.Utc).AddTicks(3454));

            migrationBuilder.CreateIndex(
                name: "IX_ChatConversations_PublicId",
                table: "ChatConversations",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatConversations_PublicId",
                table: "ChatConversations");

            migrationBuilder.DropColumn(
                name: "HasCustomTitle",
                table: "ChatConversations");

            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "ChatConversations");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 6, 17, 9, 52, 46, 262, DateTimeKind.Utc).AddTicks(1898));
        }
    }
}

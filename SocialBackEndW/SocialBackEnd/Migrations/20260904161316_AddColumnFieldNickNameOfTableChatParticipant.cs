using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddColumnFieldNickNameOfTableChatParticipant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NickName",
                table: "ChatConversationParticipants",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 9, 4, 16, 13, 15, 957, DateTimeKind.Utc).AddTicks(7648));

            migrationBuilder.CreateIndex(
                name: "IX_ChatConversationParticipants_UserId",
                table: "ChatConversationParticipants",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatConversationParticipants_Users_UserId",
                table: "ChatConversationParticipants",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatConversationParticipants_Users_UserId",
                table: "ChatConversationParticipants");

            migrationBuilder.DropIndex(
                name: "IX_ChatConversationParticipants_UserId",
                table: "ChatConversationParticipants");

            migrationBuilder.DropColumn(
                name: "NickName",
                table: "ChatConversationParticipants");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 8, 31, 15, 7, 54, 779, DateTimeKind.Utc).AddTicks(8037));
        }
    }
}

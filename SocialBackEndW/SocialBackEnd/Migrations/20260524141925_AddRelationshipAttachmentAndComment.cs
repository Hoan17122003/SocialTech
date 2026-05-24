using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationshipAttachmentAndComment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsLocked",
                table: "Comments");

            migrationBuilder.AddColumn<int>(
                name: "CommentId",
                table: "Attachments",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 5, 24, 14, 19, 24, 296, DateTimeKind.Utc).AddTicks(4769));

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_CommentId",
                table: "Attachments",
                column: "CommentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Comments_CommentId",
                table: "Attachments",
                column: "CommentId",
                principalTable: "Comments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Comments_CommentId",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_CommentId",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "CommentId",
                table: "Attachments");

            migrationBuilder.AddColumn<bool>(
                name: "IsLocked",
                table: "Comments",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 5, 12, 7, 5, 51, 81, DateTimeKind.Utc).AddTicks(3706));
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace SocialBackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageAndChatConvertstationEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChatConversations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    ConversationKey = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CommunityId = table.Column<int>(type: "int", nullable: true),
                    DirectUserLowId = table.Column<int>(type: "int", nullable: true),
                    DirectUserHighId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true),
                    LastMessagePreview = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    LastMessageSenderUserId = table.Column<int>(type: "int", nullable: true),
                    LastMessageAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatConversations", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ChatConversationParticipants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    ConversationId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    LeftAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastReadAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsMuted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatConversationParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatConversationParticipants_ChatConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "ChatConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 6, 17, 9, 52, 46, 262, DateTimeKind.Utc).AddTicks(1898));

            migrationBuilder.CreateIndex(
                name: "IX_ChatConversationParticipants_ConversationId_UserId",
                table: "ChatConversationParticipants",
                columns: new[] { "ConversationId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatConversations_CommunityId",
                table: "ChatConversations",
                column: "CommunityId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatConversations_ConversationKey",
                table: "ChatConversations",
                column: "ConversationKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatConversations_DirectUserLowId_DirectUserHighId",
                table: "ChatConversations",
                columns: new[] { "DirectUserLowId", "DirectUserHighId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatConversationParticipants");

            migrationBuilder.DropTable(
                name: "ChatConversations");

            migrationBuilder.UpdateData(
                table: "SystemStatuses",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAtUtc",
                value: new DateTime(2026, 6, 4, 2, 48, 2, 523, DateTimeKind.Utc).AddTicks(8097));
        }
    }
}

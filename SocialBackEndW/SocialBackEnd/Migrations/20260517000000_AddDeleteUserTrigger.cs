

using Microsoft.EntityFrameworkCore.Migrations;

namespace SocialBackEnd.Migrations;

public partial class AddDeleteUserTrigger : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
         CREATE TRIGGER trg_DeleteDataOfUser
            BEFORE DELETE ON Users
            FOR EACH ROW
            BEGIN
                DELETE FROM Posts
                WHERE AuthorId = OLD.Id;
            END
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DROP TRIGGER IF EXISTS trg_DeleteDataOfUser;
        ");
    }
}
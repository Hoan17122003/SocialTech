
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

public record RequestSetNickName(
    [param: FromBody]
    [param: Required]                 // bắt buộc có giá trị
    [param: StringLength(50)]         // giới hạn độ dài
    string ConversationKey,

    [param: FromBody]
    [param: Required]
    [param: MinLength(1)]             // tối thiểu 1 ký tự
    [param: MaxLength(20)]            // tối đa 20 ký tự
    string NickName,

    [param: FromBody]
    int? UserIdTarget
);
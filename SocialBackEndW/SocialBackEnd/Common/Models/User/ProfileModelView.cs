using System;

namespace SocialBackEnd.Common.Models.User;

public record ProfileModelView
{
    public int Id { set; get; }
    public string DisplayName { set; get; }
    public string Bio { set; get; }
    public string ProfileImageUrl { set; get; }
    public bool IsPrivateAccount { set; get; }
    public int FollowersCount { set; get; }
    public int FollowingsCount { set; get; }
    public List<PostModelView> RecentPosts { set; get; }
    public bool IsPermissionEdit { set; get; }
};

public record PostModelView
(
    int PostId,
    string Title,
    List<string> PathAttachment,
    string Body,
    DateTime UpdatedAt
);
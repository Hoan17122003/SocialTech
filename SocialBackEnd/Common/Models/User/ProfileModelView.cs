using System;

namespace SocialBackEnd.Common.Models.User;

public record ProfileModelView
(
    string DisplayName,
    string Bio,
    string ProfileImageUrl,
    bool IsPrivateAccount,
    int FollowersCount,
    int FollowingsCount,
    List<PostModelView> RecentPosts,
    bool IsPermissionEdit
);

public record PostModelView
(
    int PostId,
    string Title,
    List<string> PathAttachment,
    string Body,
    DateTime UpdatedAt
);
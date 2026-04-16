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
    bool IsAccount
);

public record PostModelView
(
    int PostId,
    string Title,
    string url,
    string PostType,
    string Content,
    DateTime UpdatedAt
);
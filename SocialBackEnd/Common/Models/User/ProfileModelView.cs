using System;

namespace SocialBackEnd.Common.Models.User;

public record ProfileModelView
(
    string DisplayName,
    string Bio,
    string ProfileImageUrl,
    bool IsPrivateAccount,
    int FollowersCount,
    int FollowingsCount
);
using System;

namespace SocialBackEnd.Common.Models;

public record DetailUserFollow
(
    Guid PublicId,
    string Avatar,
    string DisplayName
);

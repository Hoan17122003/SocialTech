using System;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Models.User;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IUserPort
{
    public Task<int> CreateUserAsync(RequestCreateAccount requestCreateAccount);

    public Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount);

    public Task<ProfileModelView> GetUserProfileAsync(int userTargetId, int userId);

    public Task<bool> FollowUserAsync(int userId, int targetUserId);

    public Task<bool> UnfollowUserAsync(int userId, int targetUserId);

    public Task<List<ProfileModelView>> GetDetailFollowersAsync(int userId);


}

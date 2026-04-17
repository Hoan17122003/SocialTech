using SocialBackEnd.Common.DTOs;
using SocialBackEnd.Common.DTOs.User;
using SocialBackEnd.Common.Models;
using SocialBackEnd.Common.Models.User;
using SocialBackEnd.Domain.Entities;

namespace SocialBackEnd.Application.Ports.Outbound.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<User> CreateUserAsync(RequestCreateAccount requestCreateAccount);
    Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount);

    Task<ProfileModelView> GetProfileAsync(int userId, CancellationToken cancellationToken = default);

    Task<List<DetailUserFollow>> GetDetailUserFollowAsync(int userId, Paganation paganation, CancellationToken cancellationToken = default);

}

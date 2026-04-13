using System;
using SocialBackEnd.Common.DTOs.User;

namespace SocialBackEnd.Application.Ports.Inbound;

public interface IUserPort
{
    public Task<int> CreateUserAsync(RequestCreateAccount requestCreateAccount);

    public Task<bool> UpdateUserAsync(int userId, RequestUpdateAccount requestUpdateAccount);


}

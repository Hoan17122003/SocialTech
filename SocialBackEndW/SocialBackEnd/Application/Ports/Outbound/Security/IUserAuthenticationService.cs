using System;

namespace SocialBackEnd.Application.Ports.Outbound.Security;

public interface IUserAuthenticationService
{
    // Nhận thông tin đăng nhập và trả về identity nếu xác thực thành công.
    Task<(UserIdentity?, Guid)> ValidateCredentialsAsync(string email, string password, CancellationToken cancellationToken);
}

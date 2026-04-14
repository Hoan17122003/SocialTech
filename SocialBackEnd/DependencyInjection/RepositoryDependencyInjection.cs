using Microsoft.EntityFrameworkCore;
using SocialBackEnd.Application.Ports.Outbound;
using SocialBackEnd.Application.Ports.Outbound.Repositories;
using SocialBackEnd.Infrastructure.Persistence;
using SocialBackEnd.Infrastructure.Persistence.Repositories;

namespace SocialBackEnd.DependencyInjection;

public static class RepositoryDependencyInjection
{
    public static IServiceCollection AddRepositoryDependencies(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseMySQL(connectionString));
    
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICommunityRepository, CommunityRepository>();
        services.AddScoped<ICommunityMembershipRepository, CommunityMembershipRepository>();
        services.AddScoped<ICommunityRuleRepository, CommunityRuleRepository>();
        services.AddScoped<IPostRepository, PostRepository>();
        services.AddScoped<IPostMediaAssetRepository, PostMediaAssetRepository>();
        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IPostVoteRepository, PostVoteRepository>();
        services.AddScoped<ICommentRepository, CommentRepository>();
        services.AddScoped<ICommentVoteRepository, CommentVoteRepository>();
        services.AddScoped<IContentReportRepository, ContentReportRepository>();

        return services;
    }
}

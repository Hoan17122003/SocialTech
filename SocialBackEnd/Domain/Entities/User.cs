namespace SocialBackEnd.Domain.Entities;

public class User : EntityBase
{
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public int ReputationScore { get; set; }
    public bool IsEmailVerified { get; set; }

    public bool IsPrivateAccount { get; set; } = false;

    public ICollection<UserFollow> Followers { get; set; } = new List<UserFollow>();
    public ICollection<UserFollow> Followings { get; set; } = new List<UserFollow>();

    public ICollection<Community> OwnedCommunities { get; set; } = new List<Community>();
    public ICollection<CommunityMembership> CommunityMemberships { get; set; } = new List<CommunityMembership>();
    public ICollection<Post> AuthoredPosts { get; set; } = new List<Post>();
    public ICollection<Comment> AuthoredComments { get; set; } = new List<Comment>();
    public ICollection<PostVote> PostVotes { get; set; } = new List<PostVote>();
    public ICollection<CommentVote> CommentVotes { get; set; } = new List<CommentVote>();
    public ICollection<ContentReport> SubmittedReports { get; set; } = new List<ContentReport>();
    public ICollection<ContentReport> AssignedReports { get; set; } = new List<ContentReport>();
}

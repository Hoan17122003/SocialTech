# Thảo Luận Entity Framework Core

Tài liệu này ghi chú các kiến thức quan trọng khi làm việc với Entity Framework Core trong backend .NET, bám theo case study SocialBackEnd: `User`, `Post`, `Attachments`, `UserSavedPost`, repository, service và controller.

## 1. Entity Framework Core Là Gì?

Entity Framework Core, thường gọi là EF Core, là ORM của .NET. ORM giúp ánh xạ giữa object C# và bảng trong database.

Ví dụ entity `Post`:

```csharp
public class Post : EntityBase
{
    // Tiêu đề bài viết, được map thành một cột trong bảng Posts.
    public string Title { get; set; } = string.Empty;

    // Nội dung bài viết, có thể null nếu bài chỉ có ảnh/video.
    public string? Body { get; set; }

    // Foreign key trỏ tới User tạo bài viết.
    public int AuthorId { get; set; }

    // Navigation property để EF Core biết Post thuộc về User nào.
    public User Author { get; set; } = null!;

    // Một bài viết có thể có nhiều file đính kèm.
    public ICollection<Attachments> Attachments { get; set; } = new List<Attachments>();
}
```

EF Core có thể map entity này thành bảng `Posts`, các cột `Title`, `Body`, `AuthorId`, và quan hệ tới bảng `Users`.

## 2. DbContext

`DbContext` là thành phần trung tâm của EF Core. Nó quản lý query database, tracking entity, insert/update/delete và gọi `SaveChangesAsync`.

```csharp
public sealed class AppDbContext : DbContext
{
    // DbSet đại diện cho bảng Users.
    public DbSet<User> Users => Set<User>();

    // DbSet đại diện cho bảng Posts.
    public DbSet<Post> Posts => Set<Post>();

    // DbSet đại diện cho bảng Attachments.
    public DbSet<Attachments> Attachments => Set<Attachments>();

    // DbSet đại diện cho bảng trung gian lưu bài viết.
    public DbSet<UserSavedPost> UserSavedPosts => Set<UserSavedPost>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tự động load tất cả IEntityTypeConfiguration trong cùng assembly.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

Best practice:

- `DbContext` nên đăng ký `Scoped` trong ASP.NET Core.
- Không dùng `Singleton DbContext`.
- Không share cùng một `DbContext` giữa nhiều thread.
- Không giữ `DbContext` sống quá lâu.

```csharp
services.AddDbContext<AppDbContext>(options =>
{
    // Cấu hình EF Core dùng SQL Server với connection string từ appsettings.
    options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
});
```

## 3. Entity Khác DTO

Entity dùng để mô hình hóa database/domain. DTO dùng cho API input/output.

```csharp
public record RequestCreateArticle
{
    // Dữ liệu client gửi lên để tạo bài viết.
    public string Title { get; set; } = string.Empty;

    // Content có thể null nếu bài viết chỉ chứa file.
    public string? Content { get; set; }

    // IFormFile chỉ nên nằm ở DTO/request, không nên nằm trong entity.
    public List<IFormFile>? Attachments { get; set; }

    // CommunityId có thể null nếu bài viết không thuộc community.
    public int? CommunityId { get; set; }
}
```

Map DTO sang entity:

```csharp
var post = new Post
{
    // Trim dữ liệu đầu vào trước khi lưu.
    Title = request.Title.Trim(),

    // Nếu Content null thì giữ null, nếu có thì trim.
    Body = request.Content?.Trim(),

    // userId nên lấy từ JWT claims, không nên lấy từ body.
    AuthorId = userId,

    // Gán community nếu client có gửi.
    CommunityId = request.CommunityId
};
```

## 4. Fluent API Configuration

Nên tách cấu hình entity ra file riêng trong `Infrastructure/Persistence/Configurations`.

```csharp
public sealed class PostConfiguration : IEntityTypeConfiguration<Post>
{
    public void Configure(EntityTypeBuilder<Post> builder)
    {
        // Đặt tên bảng trong database.
        builder.ToTable("Posts");

        // Khai báo primary key.
        builder.HasKey(x => x.Id);

        // Title là required và giới hạn độ dài để tránh dữ liệu quá lớn.
        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(255);

        // Body có thể dài nên dùng nvarchar(max).
        builder.Property(x => x.Body)
            .HasColumnType("nvarchar(max)");

        // Một Post thuộc về một Author.
        builder.HasOne(x => x.Author)
            .WithMany(x => x.AuthoredPosts)
            .HasForeignKey(x => x.AuthorId)
            // Restrict để tránh xóa user kéo theo xóa toàn bộ bài viết.
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

Best practice:

- Dùng Fluent API cho relationship, index, constraint và max length.
- Không nhét quá nhiều cấu hình vào `OnModelCreating`.
- Dùng `ApplyConfigurationsFromAssembly` để tự động load configuration.

## 5. One-To-Many

Case: một user có nhiều bài viết.

```csharp
public class User : EntityBase
{
    // Danh sách bài viết user đã tạo.
    public ICollection<Post> AuthoredPosts { get; set; } = new List<Post>();
}

public class Post : EntityBase
{
    // Foreign key tới User.
    public int AuthorId { get; set; }

    // Navigation property tới User.
    public User Author { get; set; } = null!;
}
```

```csharp
builder.HasOne(post => post.Author)
    // Một user có nhiều post.
    .WithMany(user => user.AuthoredPosts)
    // AuthorId là foreign key.
    .HasForeignKey(post => post.AuthorId)
    // Không tự động xóa post khi xóa user.
    .OnDelete(DeleteBehavior.Restrict);
```

## 6. Many-To-Many Implicit

Implicit many-to-many là cách không tạo entity join riêng. EF Core tự tạo bảng trung gian.

Phù hợp khi bảng trung gian chỉ cần `UserId` và `PostId`.

```csharp
public class User : EntityBase
{
    // Các bài viết user đã lưu.
    public ICollection<Post> SavedPosts { get; set; } = new List<Post>();
}

public class Post : EntityBase
{
    // Các user đã lưu bài viết này.
    public ICollection<User> SavedByUsers { get; set; } = new List<User>();
}
```

```csharp
builder.HasMany(post => post.SavedByUsers)
    // Một user cũng có nhiều bài đã lưu.
    .WithMany(user => user.SavedPosts)
    // Cấu hình bảng join implicit.
    .UsingEntity<Dictionary<string, object>>(
        "UserSavedPosts",
        right => right
            // Join table có FK tới User.
            .HasOne<User>()
            .WithMany()
            .HasForeignKey("UserId")
            .OnDelete(DeleteBehavior.Cascade),
        left => left
            // Join table có FK tới Post.
            .HasOne<Post>()
            .WithMany()
            .HasForeignKey("PostId")
            .OnDelete(DeleteBehavior.Cascade),
        join =>
        {
            // Tên bảng trung gian.
            join.ToTable("UserSavedPosts");

            // Composite key giúp một user không lưu trùng cùng một post.
            join.HasKey("UserId", "PostId");

            // Index PostId để query ngược từ post nhanh hơn.
            join.HasIndex("PostId");
        });
```

Lưu bài:

```csharp
var user = await dbContext.Users
    // Include SavedPosts để có thể Add vào collection.
    .Include(x => x.SavedPosts)
    .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

var post = await dbContext.Posts
    .FirstOrDefaultAsync(x => x.Id == postId, cancellationToken);

if (user is null || post is null)
{
    return false;
}

// Tránh lưu trùng.
if (!user.SavedPosts.Any(x => x.Id == postId))
{
    user.SavedPosts.Add(post);
    await dbContext.SaveChangesAsync(cancellationToken);
}
```

## 7. Many-To-Many Explicit

Explicit many-to-many là tạo entity join riêng. Đây là hướng nên dùng cho tính năng saved posts vì thường cần metadata như `SavedAtUtc`.

```csharp
public class UserSavedPost : EntityBase
{
    // User lưu bài viết.
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Bài viết được lưu.
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;

    // Thời điểm lưu bài.
    public DateTime SavedAtUtc { get; set; } = DateTime.UtcNow;
}
```

```csharp
public sealed class UserSavedPostConfiguration : IEntityTypeConfiguration<UserSavedPost>
{
    public void Configure(EntityTypeBuilder<UserSavedPost> builder)
    {
        builder.ToTable("UserSavedPosts");

        builder.HasKey(x => x.Id);

        // Một user không được lưu trùng một post.
        builder.HasIndex(x => new { x.UserId, x.PostId })
            .IsUnique();

        builder.Property(x => x.SavedAtUtc)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(x => x.SavedPosts)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Post)
            .WithMany(x => x.SavedByUsers)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

Lưu bài:

```csharp
var exists = await dbContext.UserSavedPosts
    // Kiểm tra user đã lưu bài này chưa.
    .AnyAsync(x => x.UserId == userId && x.PostId == postId, cancellationToken);

if (exists)
{
    return true;
}

await dbContext.UserSavedPosts.AddAsync(new UserSavedPost
{
    UserId = userId,
    PostId = postId,
    SavedAtUtc = DateTime.UtcNow
}, cancellationToken);

await dbContext.SaveChangesAsync(cancellationToken);
return true;
```

## 8. Index Và Unique Constraint

```csharp
// Email không được trùng.
builder.HasIndex(x => x.Email)
    .IsUnique();

// Một user không được lưu trùng một post.
builder.HasIndex(x => new { x.UserId, x.PostId })
    .IsUnique();

// Tăng tốc query theo PostId.
builder.HasIndex(x => x.PostId);
```

Best practice:

- Index các cột hay dùng trong `Where`, `OrderBy`, join.
- Unique nghiệp vụ nên enforce ở database, không chỉ check trong code.
- Không index bừa bãi vì index làm insert/update chậm hơn.

## 9. Tracking Và AsNoTracking

Read-only query nên dùng `AsNoTracking()`.

```csharp
var posts = await dbContext.Posts
    // Không tracking vì chỉ đọc dữ liệu.
    .AsNoTracking()
    .Where(x => x.AuthorId == userId)
    .OrderByDescending(x => x.CreatedAtUtc)
    .ToListAsync(cancellationToken);
```

Query để update thì nên tracking:

```csharp
var post = await dbContext.Posts
    // Không dùng AsNoTracking vì lát nữa sẽ sửa entity.
    .FirstOrDefaultAsync(x => x.Id == articleId, cancellationToken);

if (post is null)
{
    return false;
}

post.Title = request.Title ?? post.Title;
post.Body = request.Content ?? post.Body;
post.UpdatedAtUtc = DateTime.UtcNow;

await dbContext.SaveChangesAsync(cancellationToken);
```

## 10. Include Và Projection

`Include` dùng khi cần load navigation entity.

```csharp
var post = await dbContext.Posts
    // Load thông tin tác giả.
    .Include(x => x.Author)
    // Load danh sách file đính kèm.
    .Include(x => x.Attachments)
    .FirstOrDefaultAsync(x => x.Id == postId, cancellationToken);
```

Projection tốt hơn khi trả API response.

```csharp
var post = await dbContext.Posts
    .AsNoTracking()
    .Where(x => x.Id == postId)
    .Select(x => new PostDetailResponse
    {
        Id = x.Id,
        Title = x.Title,
        AuthorName = x.Author.DisplayName,
        AttachmentUrls = x.Attachments
            .OrderBy(a => a.Id)
            .Select(a => a.FilePath)
            .ToList()
    })
    .FirstOrDefaultAsync(cancellationToken);
```

## 11. Pagination

```csharp
var page = request.Page <= 0 ? 1 : request.Page;
var limit = request.Limit <= 0 ? 10 : request.Limit;

var posts = await dbContext.Posts
    .AsNoTracking()
    // Luôn OrderBy trước Skip/Take để phân trang ổn định.
    .OrderByDescending(x => x.CreatedAtUtc)
    .Skip((page - 1) * limit)
    .Take(limit)
    .Select(x => new PostListItem
    {
        Id = x.Id,
        Title = x.Title,
        CreatedAtUtc = x.CreatedAtUtc
    })
    .ToListAsync(cancellationToken);
```

Best practice:

- Luôn có `OrderBy` trước `Skip/Take`.
- Giới hạn max page size.
- Dữ liệu cực lớn thì cân nhắc cursor pagination.

## 12. Async, Task Và Thread

Các thao tác database là I/O-bound nên nên dùng async.

```csharp
await dbContext.Posts.FirstOrDefaultAsync(...);
await dbContext.Posts.ToListAsync(...);
await dbContext.SaveChangesAsync(...);
await dbContext.Posts.AnyAsync(...);
```

Return `Task` trực tiếp khi chỉ pass-through:

```csharp
public Task<Post?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
{
    // Không cần async/await vì method chỉ trả lại Task từ EF Core.
    return dbContext.Posts
        .AsNoTracking()
        .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
}
```

Dùng `async/await` khi cần xử lý kết quả:

```csharp
public async Task<bool> UpdatePostAsync(Post post, CancellationToken cancellationToken = default)
{
    // Đánh dấu entity cần update.
    dbContext.Posts.Update(post);

    // Chờ database lưu thay đổi.
    var affectedRows = await dbContext.SaveChangesAsync(cancellationToken);

    // Chuyển số dòng bị ảnh hưởng thành bool nghiệp vụ.
    return affectedRows > 0;
}
```

Không cần async nếu chỉ tính toán trong RAM:

```csharp
public bool IsOwner(Post post, int userId)
{
    return post.AuthorId == userId;
}
```

Nếu interface bắt buộc trả `Task<T>` nhưng kết quả có sẵn:

```csharp
public Task<bool> IsOwnerAsync(Post post, int userId)
{
    return Task.FromResult(post.AuthorId == userId);
}
```

Không nên:

```csharp
var post = dbContext.Posts.FirstOrDefaultAsync(...).Result;
dbContext.SaveChangesAsync().Wait();
```

`.Result` và `.Wait()` sẽ block thread, giảm throughput và dễ gây lỗi khó debug.

Luồng Task/thread khi gọi EF async:

1. ASP.NET nhận request trên một thread pool thread.
2. Code gọi EF Core async query.
3. EF gửi command xuống database.
4. Trong lúc chờ DB trả kết quả, thread được trả về thread pool.
5. DB trả kết quả.
6. Code sau `await` tiếp tục chạy trên một thread pool thread.

Vì vậy async giúp server xử lý nhiều request đồng thời tốt hơn.

## 13. Transaction

Dùng transaction khi nhiều thao tác DB phải thành công cùng nhau.

```csharp
await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
try
{
    post.Title = request.Title ?? post.Title;
    post.UpdatedAtUtc = DateTime.UtcNow;

    // Xóa attachment cũ.
    dbContext.Attachments.RemoveRange(oldAttachments);

    // Thêm attachment mới.
    await dbContext.Attachments.AddRangeAsync(newAttachments, cancellationToken);

    await dbContext.SaveChangesAsync(cancellationToken);

    // Chỉ commit khi tất cả thao tác DB thành công.
    await transaction.CommitAsync(cancellationToken);
}
catch
{
    // Nếu có lỗi thì rollback DB.
    await transaction.RollbackAsync(cancellationToken);
    throw;
}
```

Lưu ý: transaction DB không rollback được file vật lý trong `wwwroot`. Với file storage, nên có cleanup riêng nếu DB fail.

## 14. Case Study: Create Article Với Attachments

```csharp
var post = new Post
{
    Title = request.Title.Trim(),
    Body = request.Content?.Trim(),
    AuthorId = userId,
    CommunityId = request.CommunityId
};

// Lưu Post trước để có post.Id dùng làm folder lưu file.
var createdPost = await _postRepository.CreatePostAsync(post, cancellationToken);

if (request.Attachments is { Count: > 0 })
{
    // Lưu file vật lý vào wwwroot/uploads/posts/{postId}.
    var storedFiles = await _storage.SavePostAttachmentsAsync(
        createdPost.Id,
        request.Attachments,
        cancellationToken);

    // Map metadata file thành entity Attachments.
    var attachments = storedFiles.Select(file => new Attachments
    {
        PostId = createdPost.Id,
        FilePath = file.FilePath,
        FileName = file.FileName,
        FileExtension = file.FileExtension,
        FileSize = file.FileSize
    }).ToList();

    // Lưu metadata file vào database.
    await _attachmentRepository.AddAttachmentsAsync(attachments, cancellationToken);
}
```

## 15. Case Study: Update Article Và Sync Attachments

Yêu cầu:

- File request trùng tên với DB và file vật lý còn tồn tại: giữ nguyên.
- File request trùng tên với DB nhưng file vật lý đã mất: xóa record hỏng và lưu lại file.
- File mới: lưu thêm.
- File DB không còn trong request: xóa record và xóa file vật lý.

```csharp
var currentAttachments = await _attachmentRepository.GetAttachmentsByPostIdAsync(articleId);

// Chỉ các record có file thật trên disk mới được xem là hợp lệ.
var existingAttachments = currentAttachments
    .Where(x => _storage.FileExists(x.FilePath))
    .ToList();

// Record còn trong DB nhưng file vật lý mất thì coi là record hỏng.
var missingFileAttachments = currentAttachments
    .Where(x => !_storage.FileExists(x.FilePath))
    .ToList();

var requestedFileNames = request.Attachments
    .Where(file => file.Length > 0)
    .Select(file => Path.GetFileName(file.FileName))
    .ToHashSet(StringComparer.OrdinalIgnoreCase);

// Xóa file không còn trong request và record hỏng.
var attachmentsToDelete = existingAttachments
    .Where(x => !requestedFileNames.Contains(x.FileName))
    .Concat(missingFileAttachments)
    .ToList();

foreach (var attachment in attachmentsToDelete)
{
    _attachmentRepository.Remove(attachment);
}

await _attachmentRepository.SaveChangesAsync(cancellationToken);
await _storage.DeleteFilesAsync(attachmentsToDelete.Select(x => x.FilePath), cancellationToken);

var currentFileNames = existingAttachments
    .Select(x => x.FileName)
    .ToHashSet(StringComparer.OrdinalIgnoreCase);

// File request chưa có trong DB hợp lệ thì lưu mới.
var attachmentsToSave = request.Attachments
    .Where(file => file.Length > 0)
    .Where(file => !currentFileNames.Contains(Path.GetFileName(file.FileName)))
    .ToList();

var storedFiles = await _storage.SavePostAttachmentsAsync(articleId, attachmentsToSave, cancellationToken);
```

Nếu muốn chính xác hơn so với so sánh `FileName`, có thể tính hash file như SHA256 để biết file có cùng nội dung hay không.

## 16. Checklist Tối Ưu EF Core

- Dùng `AsNoTracking()` cho read-only query.
- Dùng projection `Select` cho API response.
- Không `Include` quá rộng.
- Luôn pagination list endpoint.
- Đặt index cho column filter/sort/join.
- Dùng async EF API cho I/O.
- Không dùng `.Result` hoặc `.Wait()`.
- Không query database trong vòng lặp nếu có thể gom query.
- Không gọi `SaveChangesAsync` nhiều lần không cần thiết.
- Dùng transaction cho use case nhiều thao tác cần atomic.
- Profile trước khi tối ưu phức tạp.

## 17. Checklist Khi Tạo Bảng Mới

1. Tạo entity trong `Domain/Entities`.
2. Xác định quan hệ: one-to-many, one-to-one, many-to-many.
3. Thêm navigation property.
4. Thêm `DbSet` trong `AppDbContext`.
5. Tạo configuration class.
6. Cấu hình table name, key, required, max length, index.
7. Cấu hình delete behavior.
8. Tạo repository nếu cần.
9. Tạo migration.
10. Review migration.
11. Update database.
12. Viết service use case.
13. Viết controller endpoint.
14. Test happy path và edge cases.

## 18. Các Lỗi Hay Gặp

Dùng `.Result` hoặc `.Wait()`:

```csharp
var user = _repository.GetByEmailAsync(email).Result;
```

Nên:

```csharp
var user = await _repository.GetByEmailAsync(email, cancellationToken);
```

Dùng `AsNoTracking()` rồi update:

```csharp
var post = await dbContext.Posts.AsNoTracking().FirstAsync(x => x.Id == id);
post.Title = "New";
await dbContext.SaveChangesAsync();
```

EF không tracking nên không biết entity đã thay đổi.

Không đặt unique index nghiệp vụ:

```csharp
builder.HasIndex(x => new { x.UserId, x.PostId }).IsUnique();
```

Tin `userId` từ body:

```csharp
var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
```

Nên lấy user id từ JWT claims.

## 19. Kết Luận

EF Core rất mạnh nếu dùng đúng:

- Entity rõ ràng.
- Configuration tách riêng.
- Relationship được mô hình hóa đúng.
- Query dùng projection, pagination và index.
- Async dùng cho I/O.
- Không block bằng `.Result` hoặc `.Wait()`.
- Transaction dùng cho nhiều thao tác cần atomic.
- File storage cần xử lý riêng vì DB transaction không rollback file.


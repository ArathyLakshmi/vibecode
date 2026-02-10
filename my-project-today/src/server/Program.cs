using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

// Optional JWT / OpenID Connect authentication configuration
var authority = builder.Configuration["Authentication:Authority"];
var audience = builder.Configuration["Authentication:Audience"];
if (!string.IsNullOrWhiteSpace(authority) && !string.IsNullOrWhiteSpace(audience))
{
    builder.Services.AddAuthentication("Bearer")
        .AddJwtBearer("Bearer", options =>
        {
            options.Authority = authority;
            options.Audience = audience;
            // Allow HTTP for local development if needed; ensure HTTPS in production
            options.RequireHttpsMetadata = false;
        });
    builder.Services.AddAuthorization();
}

// Configure EF Core with SQLite database in the application content root
var dbPath = Path.Combine(builder.Environment.ContentRootPath, "meetingrequests.db");
builder.Services.AddDbContext<MeetingRequestsDbContext>(options => options.UseSqlite($"Data Source={dbPath}"));

var app = builder.Build();

// Ensure database exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MeetingRequestsDbContext>();
    db.Database.EnsureCreated();
}

app.UseRouting();

// Allow popups opened by the app to communicate back to the opener when navigating
// to external identity providers (MSAL popup flows). Without this header, some
// browsers' cross-origin opener policies will block `window.closed` / opener access.
app.Use(async (context, next) =>
{
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups";
    await next();
});

app.UseStaticFiles();

// Enable authentication/authorization middleware if configured
if (!string.IsNullOrWhiteSpace(authority) && !string.IsNullOrWhiteSpace(audience))
{
    app.UseAuthentication();
    app.UseAuthorization();
}

// Middleware: protect SPA routes by redirecting unauthenticated users to /login
if (!string.IsNullOrWhiteSpace(authority) && !string.IsNullOrWhiteSpace(audience))
{
    app.Use(async (context, next) =>
    {
        var path = context.Request.Path.Value ?? string.Empty;
        // Skip API and static assets and the login route
        if (!path.StartsWith("/api") && !path.StartsWith("/login") && !Path.HasExtension(path))
        {
            var user = context.User;
            if (user?.Identity == null || !user.Identity.IsAuthenticated)
            {
                // Redirect to SPA login route
                context.Response.Redirect("/login");
                return;
            }
        }
        await next();
    });
}

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});

app.MapFallbackToFile("index.html");

app.Run();

// Expose Program class for integration tests
public partial class Program { }
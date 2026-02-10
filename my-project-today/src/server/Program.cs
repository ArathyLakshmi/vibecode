using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

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
app.UseStaticFiles();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});

app.MapFallbackToFile("index.html");

app.Run();
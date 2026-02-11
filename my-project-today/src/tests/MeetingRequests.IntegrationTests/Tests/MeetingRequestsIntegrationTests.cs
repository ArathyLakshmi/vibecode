using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace MeetingRequests.IntegrationTests.Tests;

public class MeetingRequestsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public MeetingRequestsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Post_CreateMeetingRequest_ReturnsId()
    {
        var client = _factory.CreateClient();

        var body = new
        {
            MeetingTitle = "Integration Test Meeting",
            MeetingDate = "2026-02-20",
            AlternateDate = "2026-02-22",
            MeetingCategory = "Governance",
            MeetingSubcategory = "Board Meeting",
            MeetingDescription = "E2E test description",
            Comments = "No comments",
            Classification = "Internal"
        };

        var resp = await client.PostAsJsonAsync("/api/meetingrequests", body);
        Assert.True(resp.IsSuccessStatusCode, await resp.Content.ReadAsStringAsync());

        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("id", out var idProp));
        Assert.True(idProp.GetInt32() > 0);
    }

    [Fact]
    public async Task Post_SaveDraft_And_List_ReturnsDraftAndCreated()
    {
        var client = _factory.CreateClient();

        var draft = new
        {
            MeetingTitle = "Draft Meeting",
            MeetingDate = "",
            AlternateDate = "",
            MeetingCategory = "Operations",
            MeetingSubcategory = "Planning",
            MeetingDescription = "Draft description"
        };

        var draftResp = await client.PostAsJsonAsync("/api/meetingrequests/draft", draft);
        Assert.True(draftResp.IsSuccessStatusCode, await draftResp.Content.ReadAsStringAsync());

        var created = new
        {
            MeetingTitle = "Created Meeting",
            MeetingDate = "2026-02-21",
            AlternateDate = "2026-02-23",
            MeetingCategory = "Operations",
            MeetingSubcategory = "Standup",
            MeetingDescription = "Created description",
            Comments = "",
            Classification = "Internal"
        };

        var createResp = await client.PostAsJsonAsync("/api/meetingrequests", created);
        Assert.True(createResp.IsSuccessStatusCode, await createResp.Content.ReadAsStringAsync());

        var listResp = await client.GetAsync("/api/meetingrequests");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);

        var listJson = await listResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(listJson.ValueKind == JsonValueKind.Array);
        Assert.True(listJson.GetArrayLength() >= 2);
    }
}

using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace VibeCode.Server.Utils
{
    public class FlexibleDateTimeConverter : JsonConverter<DateTime?>
    {
        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null) return null;
            if (reader.TokenType == JsonTokenType.String)
            {
                var s = reader.GetString();
                if (string.IsNullOrWhiteSpace(s)) return null;
                // Try round-trip / ISO first
                if (DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
                    return dt;
                // Common date-only format
                if (DateTime.TryParseExact(s, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.AssumeUniversal, out dt))
                    return dt;
                // Fallback to general parse
                if (DateTime.TryParse(s, out dt)) return dt;
                return null;
            }
            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetInt64(out var l))
                {
                    try
                    {
                        return DateTimeOffset.FromUnixTimeSeconds(l).UtcDateTime;
                    }
                    catch { }
                }
            }
            return null;
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value.HasValue) writer.WriteStringValue(value.Value.ToString("o"));
            else writer.WriteNullValue();
        }
    }
}

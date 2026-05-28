using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

const string Segment = "seq";
const string ServiceName = "seq-api";

LoadEnv();

var domain = Environment.GetEnvironmentVariable("AUTH0_DOMAIN")?.Trim();
var audience = NormalizeAudience(Environment.GetEnvironmentVariable("AUTH0_AUDIENCE"));
var issuerOverride = Environment.GetEnvironmentVariable("AUTH0_ISSUER")?.Trim();
var verifyDisabled = Environment.GetEnvironmentVariable("AUTH0_VERIFY_DISABLED") == "true";

var builder = WebApplication.CreateBuilder(args);

if (!verifyDisabled)
{
  if (string.IsNullOrEmpty(domain) || string.IsNullOrEmpty(audience))
  {
    builder.Services.AddSingleton<AuthMode>(new AuthMode.NotConfigured());
  }
  else
  {
    var issuer = ResolveIssuer(domain, issuerOverride);
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
      .AddJwtBearer(options =>
      {
        options.Authority = issuer.TrimEnd('/');
        options.Audience = audience;
        options.TokenValidationParameters = new TokenValidationParameters
        {
          ValidateIssuer = true,
          ValidateAudience = true,
          ClockSkew = TimeSpan.FromMinutes(5),
        };
      });
    builder.Services.AddAuthorization();
    builder.Services.AddSingleton<AuthMode>(new AuthMode.JwtBearer());
  }
}
else
{
  Console.WriteLine(
    "[seq-api] AUTH0_VERIFY_DISABLED=true — JWTs are not cryptographically verified.");
  builder.Services.AddSingleton<AuthMode>(new AuthMode.VerifyDisabled());
}

var app = builder.Build();

app.Use(async (context, next) =>
{
  context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
  context.Response.Headers.Append(
    "Access-Control-Allow-Methods",
    "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  context.Response.Headers.Append(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization");
  if (context.Request.Method == "OPTIONS")
  {
    context.Response.StatusCode = StatusCodes.Status204NoContent;
    return;
  }
  await next();
});

var authMode = app.Services.GetRequiredService<AuthMode>();

if (authMode is AuthMode.JwtBearer)
{
  app.UseAuthentication();
  app.UseAuthorization();
}

app.MapGet("/", () => Results.Text(
  $"{{\"message\":\"Spectra {ServiceName}\",\"segment\":\"{Segment}\"}}",
  "application/json"));

app.MapGet($"/v1/{Segment}/health", () => Results.Json(new { status = "ok" }));

app.MapGet($"/v1/{Segment}/ready", () => Results.Json(new
{
  status = "ok",
  checks = new { runtime = "ok" },
}));

var helloRoute = app.MapGet(
  $"/v1/{Segment}/hello",
  (HttpContext ctx) => HandleHello(ctx, authMode, Segment, ServiceName));
if (authMode is AuthMode.JwtBearer)
{
  helloRoute.RequireAuthorization();
}

var port = int.TryParse(Environment.GetEnvironmentVariable("PORT"), out var p) ? p : 3003;
var host = Environment.GetEnvironmentVariable("HOST") ?? "localhost";
app.Urls.Add($"http://{host}:{port}");
Console.WriteLine($"[ ready ] http://{host}:{port}");
app.Run();

static IResult HandleHello(
  HttpContext ctx,
  AuthMode authMode,
  string segment,
  string service)
{
  string? sub;

  switch (authMode)
  {
    case AuthMode.NotConfigured:
      return Results.Json(
        new
        {
          error = "auth_not_configured",
          message =
            "Set AUTH0_DOMAIN and AUTH0_AUDIENCE, or AUTH0_VERIFY_DISABLED=true for local development only.",
        },
        statusCode: StatusCodes.Status503ServiceUnavailable);
    case AuthMode.VerifyDisabled:
    {
      var token = ExtractBearer(ctx);
      if (token == null)
      {
        return MissingToken();
      }
      try
      {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        sub = jwt.Subject ?? "unknown";
      }
      catch
      {
        return InvalidToken("Token decode failed.");
      }
      break;
    }
    case AuthMode.JwtBearer:
      sub = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? ctx.User.FindFirstValue("sub")
        ?? "unknown";
      break;
    default:
      sub = "unknown";
      break;
  }

  return Results.Json(new
  {
    message = $"Hello from {service}",
    segment,
    service,
    authenticated = true,
    principal = new { sub },
  });
}

static IResult MissingToken() =>
  Results.Json(
    new
    {
      error = "missing_token",
      message = "Authorization: Bearer <access_token> is required.",
    },
    statusCode: StatusCodes.Status401Unauthorized);

static IResult InvalidToken(string message) =>
  Results.Json(
    new { error = "invalid_token", message },
    statusCode: StatusCodes.Status401Unauthorized);

static string? ExtractBearer(HttpContext ctx)
{
  var hdr = ctx.Request.Headers.Authorization.ToString();
  if (!hdr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
  {
    return null;
  }
  var token = hdr[7..].Trim();
  return string.IsNullOrEmpty(token) ? null : token;
}

static string? NormalizeAudience(string? raw) =>
  string.IsNullOrWhiteSpace(raw) ? null : raw.Trim().TrimEnd('/');

static string ResolveIssuer(string domain, string? issuerOverride)
{
  if (!string.IsNullOrWhiteSpace(issuerOverride))
  {
    return issuerOverride.EndsWith('/') ? issuerOverride : issuerOverride + "/";
  }
  var host = domain.Replace("https://", "", StringComparison.OrdinalIgnoreCase)
    .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
    .TrimEnd('/');
  return $"https://{host}/";
}

static void LoadEnv()
{
  var dir = Directory.GetCurrentDirectory();
  for (var i = 0; i < 24; i++)
  {
    var nx = Path.Combine(dir, "nx.json");
    if (File.Exists(nx))
    {
      var envPath = Path.Combine(dir, ".env");
      if (File.Exists(envPath))
      {
        DotNetEnv.Env.Load(envPath);
      }
      var devPath = Path.Combine(dir, "apps/services/seq-api/.env.development");
      if (File.Exists(devPath))
      {
        DotNetEnv.Env.Load(devPath);
      }
      return;
    }
    var parent = Directory.GetParent(dir);
    if (parent == null) break;
    dir = parent.FullName;
  }
}

abstract record AuthMode
{
  public sealed record JwtBearer : AuthMode;
  public sealed record VerifyDisabled : AuthMode;
  public sealed record NotConfigured : AuthMode;
}

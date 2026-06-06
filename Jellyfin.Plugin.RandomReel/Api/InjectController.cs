using System.IO;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.RandomReel.Api;

/// <summary>
/// Serves the client-side JavaScript that injects the Random Reel context menu item.
/// </summary>
[ApiController]
[Route("RandomReel")]
public class InjectController : ControllerBase
{
    /// <summary>
    /// Returns the inject.js script embedded in the plugin assembly.
    /// Must be anonymous so Jellyfin can load it before the user logs in.
    /// </summary>
    /// <returns>JavaScript source.</returns>
    [HttpGet("inject.js")]
    [AllowAnonymous]
    [Produces("application/javascript")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetInjectScript()
    {
        var assembly = Assembly.GetExecutingAssembly();
        const string ResourceName = "Jellyfin.Plugin.RandomReel.Web.inject.js";

        var stream = assembly.GetManifestResourceStream(ResourceName);
        if (stream is null)
        {
            return NotFound("inject.js resource not found in assembly.");
        }

        using var reader = new StreamReader(stream);
        var content = reader.ReadToEnd();
        return Content(content, "application/javascript");
    }
}

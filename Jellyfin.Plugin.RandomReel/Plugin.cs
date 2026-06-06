using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Jellyfin.Plugin.RandomReel.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.RandomReel;

/// <summary>
/// Random Reel plugin — plays random clips from a folder or playlist.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string ScriptTag = "<script src=\"/RandomReel/inject.js\" defer></script>";
    private const string FallbackWebPath = "/jellyfin/jellyfin-web";

    private readonly ILogger<Plugin> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Instance of the <see cref="IApplicationPaths"/> interface.</param>
    /// <param name="xmlSerializer">Instance of the <see cref="IXmlSerializer"/> interface.</param>
    /// <param name="logger">Logger.</param>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer, ILogger<Plugin> logger)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        _logger = logger;
        PatchIndexHtml(applicationPaths);
    }

    /// <inheritdoc />
    public override string Name => "Random Reel";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("a3a23ce9-cf03-4772-b49a-170913d6139a");

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = string.Format(CultureInfo.InvariantCulture, "{0}.Configuration.configPage.html", GetType().Namespace)
            }
        ];
    }

    private void PatchIndexHtml(IApplicationPaths appPaths)
    {
        try
        {
            var indexPath = FindIndexHtml(appPaths);
            if (indexPath is null)
            {
                _logger.LogWarning("[RandomReel] index.html not found — JS injection skipped.");
                return;
            }

            var content = File.ReadAllText(indexPath);
            if (content.Contains(ScriptTag, StringComparison.Ordinal))
            {
                _logger.LogInformation("[RandomReel] index.html already patched.");
                return;
            }

            content = content.Replace("</body>", ScriptTag + "\n</body>", StringComparison.OrdinalIgnoreCase);
            File.WriteAllText(indexPath, content);
            _logger.LogInformation("[RandomReel] Patched index.html at {Path}.", indexPath);
        }
        catch (UnauthorizedAccessException)
        {
            _logger.LogError(
                "[RandomReel] Permission denied patching index.html. " +
                "Mount the file as a writable Docker volume (see deploy.sh).");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomReel] Failed to patch index.html.");
        }
    }

    private string? FindIndexHtml(IApplicationPaths appPaths)
    {
        // Try IApplicationPaths.WebPath (Jellyfin 10.9+)
        try
        {
            var webPath = appPaths.WebPath;
            if (!string.IsNullOrEmpty(webPath))
            {
                var p = Path.Combine(webPath, "index.html");
                if (File.Exists(p))
                {
                    return p;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[RandomReel] WebPath not available, trying fallback.");
        }

        // Fallback: standard Docker image path
        var fallback = Path.Combine(FallbackWebPath, "index.html");
        return File.Exists(fallback) ? fallback : null;
    }
}

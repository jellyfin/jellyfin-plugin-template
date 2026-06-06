using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.RandomReel.Configuration;

/// <summary>
/// Plugin configuration.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PluginConfiguration"/> class.
    /// </summary>
    public PluginConfiguration()
    {
        PlaybackDurationMinutes = 10;
        EdgeExclusionMinutes = 5;
        AllowRepeatsInSession = false;
    }

    /// <summary>
    /// Gets or sets how many minutes each video clip should play.
    /// </summary>
    public int PlaybackDurationMinutes { get; set; }

    /// <summary>
    /// Gets or sets how many minutes to exclude from the start and end of each video
    /// when picking a random start position.
    /// </summary>
    public int EdgeExclusionMinutes { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the same video can be picked more than
    /// once within the same session.
    /// </summary>
    public bool AllowRepeatsInSession { get; set; }
}

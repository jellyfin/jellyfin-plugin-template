using System;

namespace Jellyfin.Plugin.RandomReel.Api;

/// <summary>
/// Response returned by the shuffle endpoint.
/// </summary>
public class ShuffleNextResponse
{
    /// <summary>Gets or sets the item id to play.</summary>
    public Guid ItemId { get; set; }

    /// <summary>Gets or sets the item name (for display purposes).</summary>
    public string ItemName { get; set; } = string.Empty;

    /// <summary>Gets or sets the position (in ticks) at which playback should start.</summary>
    public long StartPositionTicks { get; set; }

    /// <summary>Gets or sets how many ticks the client should play before stopping.</summary>
    public long PlaybackDurationTicks { get; set; }

    /// <summary>Gets or sets the total duration of the item in ticks.</summary>
    public long TotalDurationTicks { get; set; }

    /// <summary>Gets or sets how many items remain in the session pool (0 = pool exhausted).</summary>
    public int RemainingInPool { get; set; }
}

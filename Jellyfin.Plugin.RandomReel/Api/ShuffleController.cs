using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Jellyfin.Data.Enums;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.RandomReel.Api;

/// <summary>
/// Shuffle API controller.
/// </summary>
[ApiController]
[Route("RandomReel")]
public class ShuffleController : ControllerBase
{
    private const long TicksPerMinute = 600_000_000L;

    // Key: sessionKey (sessionId + ":" + folderId), Value: set of already-played item ids.
    private static readonly ConcurrentDictionary<string, HashSet<Guid>> SessionPlayed
        = new(StringComparer.OrdinalIgnoreCase);

    private static readonly Random Rng = new();

    private readonly ILibraryManager _libraryManager;
    private readonly ILogger<ShuffleController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShuffleController"/> class.
    /// </summary>
    /// <param name="libraryManager">Library manager.</param>
    /// <param name="logger">Logger.</param>
    public ShuffleController(ILibraryManager libraryManager, ILogger<ShuffleController> logger)
    {
        _libraryManager = libraryManager;
        _logger = logger;
    }

    /// <summary>
    /// Returns the next random video to play from a folder or playlist.
    /// </summary>
    /// <param name="folderId">Id of the folder, collection or playlist.</param>
    /// <param name="sessionId">Opaque string that identifies the current shuffle session.
    /// Pass the same value across calls to maintain the played-items pool.
    /// Omit or change it to start fresh.</param>
    /// <returns>The item to play and the start position.</returns>
    [HttpGet("Next")]
    [Authorize]
    [ProducesResponseType(typeof(ShuffleNextResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<ShuffleNextResponse> GetNext(
        [FromQuery][Required] Guid folderId,
        [FromQuery] string? sessionId = null)
    {
        var config = Plugin.Instance?.Configuration;
        if (config is null)
        {
            return BadRequest("Plugin configuration not available.");
        }

        var folder = _libraryManager.GetItemById(folderId);
        if (folder is null)
        {
            return NotFound($"Folder {folderId} not found.");
        }

        var query = new InternalItemsQuery
        {
            ParentId = folderId,
            IncludeItemTypes = [BaseItemKind.Movie, BaseItemKind.Episode, BaseItemKind.Video],
            IsVirtualItem = false,
            Recursive = true,
        };

        var allItems = _libraryManager.GetItemList(query)
            .Where(i => i.RunTimeTicks.HasValue && i.RunTimeTicks.Value > 0)
            .ToList();

        if (allItems.Count == 0)
        {
            return NotFound("No playable video items found in the specified folder.");
        }

        var sessionKey = BuildSessionKey(sessionId, folderId);
        var played = config.AllowRepeatsInSession
            ? new HashSet<Guid>()
            : SessionPlayed.GetOrAdd(sessionKey, _ => new HashSet<Guid>());

        var pool = allItems
            .Where(i => config.AllowRepeatsInSession || !played.Contains(i.Id))
            .ToList();

        if (pool.Count == 0)
        {
            // Pool exhausted — reset and start over.
            lock (played)
            {
                played.Clear();
            }

            pool = allItems;
            _logger.LogInformation("Shuffle pool exhausted for session {Session}, restarting.", sessionKey);
        }

        var chosen = pool[Rng.Next(pool.Count)];

        if (!config.AllowRepeatsInSession)
        {
            lock (played)
            {
                played.Add(chosen.Id);
            }
        }

        var totalTicks = chosen.RunTimeTicks!.Value;
        var exclusionTicks = config.EdgeExclusionMinutes * TicksPerMinute;
        var playbackTicks = config.PlaybackDurationMinutes * TicksPerMinute;

        var windowStart = exclusionTicks;
        var windowEnd = totalTicks - exclusionTicks - playbackTicks;

        long startTicks;
        if (windowEnd <= windowStart)
        {
            // Video too short for the configured margins — start at position 0.
            startTicks = 0;
            _logger.LogWarning(
                "Item {Name} ({Id}) is too short for the configured margins; starting at 0.",
                chosen.Name,
                chosen.Id);
        }
        else
        {
            var windowRange = windowEnd - windowStart;
            startTicks = windowStart + (long)(Rng.NextDouble() * windowRange);
        }

        var remaining = pool.Count - 1;

        _logger.LogInformation(
            "Shuffle: selected '{Name}' ({Id}), start={Start}min, pool remaining={Remaining}",
            chosen.Name,
            chosen.Id,
            startTicks / TicksPerMinute,
            remaining);

        return Ok(new ShuffleNextResponse
        {
            ItemId = chosen.Id,
            ItemName = chosen.Name ?? string.Empty,
            StartPositionTicks = startTicks,
            PlaybackDurationTicks = playbackTicks,
            TotalDurationTicks = totalTicks,
            RemainingInPool = remaining,
        });
    }

    /// <summary>
    /// Resets the played-items history for a given session.
    /// </summary>
    /// <param name="folderId">The folder id associated with the session.</param>
    /// <param name="sessionId">The session id to reset.</param>
    /// <returns>No content.</returns>
    [HttpPost("Session/Reset")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult ResetSession(
        [FromQuery][Required] Guid folderId,
        [FromQuery] string? sessionId = null)
    {
        var sessionKey = BuildSessionKey(sessionId, folderId);
        SessionPlayed.TryRemove(sessionKey, out _);
        _logger.LogInformation("Shuffle session {Session} reset.", sessionKey);
        return NoContent();
    }

    private static string BuildSessionKey(string? sessionId, Guid folderId)
        => $"{sessionId ?? "default"}:{folderId}";
}

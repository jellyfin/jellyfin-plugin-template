using MediaBrowser.Model.Plugins;

namespace FrameDropCheck.Plugin.Configuration;

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
        // 기본값 설정
        FfmpegPath = "/usr/bin/ffmpeg";
        MediaScanTime = "02:00";
        BackupPath = "/media/backup/framedrop";
    }

    /// <summary>
    /// Gets or sets FFmpeg 실행 파일의 경로.
    /// </summary>
    public string FfmpegPath { get; set; }

    /// <summary>
    /// Gets or sets 미디어 스캔 시작 시간 (HH:mm).
    /// </summary>
    public string MediaScanTime { get; set; }

    /// <summary>
    /// Gets or sets 프레임 드롭이 발생한 미디어 파일의 백업 경로.
    /// </summary>
    public string BackupPath { get; set; }
}

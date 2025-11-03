# FrameDropCheck Plugin

## Overview

The FrameDropCheck plugin for Jellyfin is designed to monitor media playback for frame drops and automatically encode videos to maintain quality. This plugin integrates with Jellyfin's API to check the status of media files and perform necessary actions based on user-defined settings.

## Features

- Monitors registered media for frame drops during playback.
- Automatically encodes videos that exhibit frame drops, ensuring minimal quality loss.
- Allows users to configure settings for monitoring and encoding through the plugin's configuration.
- Utilizes FFmpeg for transcoding videos.
- Provides an API for users to trigger checks and view the status of media files.

## Project Structure

```text
FrameDropCheck.Plugin
├── src
│   ├── Configuration
│   │   └── PluginConfiguration.cs
│   ├── Data
│   │   ├── FrameDropDbContext.cs
│   │   └── MediaItem.cs
│   ├── Services
│   │   ├── FrameDropChecker.cs
│   │   ├── EncodingService.cs
│   │   └── SchedulerService.cs
│   ├── Utils
│   │   └── FfmpegLogParser.cs
│   ├── Controllers
│   │   └── FrameDropController.cs
│   ├── Plugin.cs
│   └── types
│       └── index.ts
├── FrameDropCheck.Plugin.csproj
├── appsettings.json
└── README.md
```

## Installation

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Build the project using your preferred .NET build tool.
4. Install the plugin in your Jellyfin instance by placing the compiled DLL in the plugins directory.

## Configuration

The plugin can be configured through the `PluginConfiguration.cs` file, where users can set parameters such as:

- Monitoring intervals
- Encoding settings
- Database connection strings

## Usage

- The plugin will automatically monitor media playback for frame drops based on the configured settings.
- Users can trigger manual checks and view the status of media files through the provided API endpoints.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

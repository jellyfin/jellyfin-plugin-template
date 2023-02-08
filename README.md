# Library-Manager

## About

**This plugin is not yet functional. This is still a work in progress!**

This plugin let the user manage his library without having to go in the file explorer. This will let you change the library of the media. It will also give you the ability to create a new library when changing the library of the media.

## Installation

- Repository (Jellyfin)
  - To install this plugin in Jellyfin, you will have to go in the plugin setting in the dashboard of your Jellyfin, then add the repository : ``` https://raw.githubusercontent.com/Amatsu-Kami/jellyfin-plugin-library-manager/master/manifest.json```
- Manual
  - Download Archive from [Latest Release](https://github.com/Amatsu-Kami/jellyfin-plugin-library-manager/releases/latest)
  - Follow the [instruction](https://jellyfin.org/docs/general/server/plugins/index.html)

## How to use

Once the plugin is installed on Jellyfin, you will be able to use it when you log in as the administrator. If you click on the 3 dot of a media, in the menu that pops up, there will be an option called "Edit Library". If you chose that option, you will then see a dropdown menu with the function you want to use, the default function is "Change Library". There will also be another dropdown menu with all your library. The library you chose will be the library the media will move to.

There will also be an option in the dropdown menu called "Add Library", which will show the window to add a library, once the library is created, you will be brought back to the dropdown menu with all your library.

In the first dropdown menu, where you choose the function to use, you can change it to "Add To Library". This functionality will let you copy the media to another library, but beware as this will take double the space, since the media will be present in two library.

## Code

The standard of this plugin is the same as Jellyfin. Jellyfin is built using .NET 6 and C#.

## Contribute

You can contribute to this project by creating issues for bugs you found or features you think would be a good addition to this plugin. You can also fork this project to make the changes yourself.

## License

This plugin use a GPLv3 license. To see the license, see the "LICENSE" file in the project.

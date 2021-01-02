# How-To Compile, Install & Run Jellyfin Template plugin
  
  
document creation date: 01/01/2021
  
## Intro
  
1. Jellyfin is a Plex OpenSource equivalent, to read more about it goto: https://jellyfin.org  
2. Jellyfin has plugin infrastructure to expand and enhance it's capabilities, plugin are written in C# and Html  
3. A good staring point for Jellyfin Plugin Development is the 'Template' project found at: https://github.com/jellyfin/jellyfin-plugin-template  
4. the template project needs more info for beginners, this readme file is a step by step guide to build and install 'Template' plugin project  
5. Steps include:  
	- Download & Install Jellyfin 'unstable' version
	- Download the 'Template' plugin solution
	- Open the 'Template' plugin solution in latest 'Microsoft Visual Studio'
	- Create a GUID
	- Update strings in the code (plugin Name & GUID)
	- Compile the solution
	- Copy the dll into a new folder in  the jellyfin plugins folder & start the jellyfin server
	- Check your Template Plugin installed  
	
  
## Download & Install Jellyfin 'unstable' version
  
1. goto: https://jellyfin.org/downloads  
2. select your Operating system and click the 'Unstable' link (the Template plugin usually rely on latest development artifacts such as: MediaBrowser.Common 10.7 for this release so for it to work i suggest to prefer the unstable [latest night build] release)  
3. then click the 'combined' link (this will download the server and the web client together)  
4. once the zip has downloaded - extract it to a folder (lets say on windows: `%UserProfile%\Downloads\jellyfin_20210101.9-unstable`)  
5. copy the content into a folder where you wish to run the unstable version server from (lets say on windows: `C:\Program Files\Jellyfin`)  
6. so now you have a folder called: `C:\Program Files\Jellyfin\jellyfin_20210101.9` and in it you will find:  
	- jellyfin-web
	- Resources
	- wwwroot
	- api-ms-win-core-console-l1-1-0.dll
	- ...  
7. rename the folder: jellyfin_20210101.9 to: Server so you will have the path: `C:\Program Files\Jellyfin\Server`  
8. from that folder run the Jellyfin executable file, for windows it is: `C:\Program Files\Jellyfin\Server\Jellyfin.exe`  
9. after running the server check if it is up by going to: http://localhost:8096  
10. follow the wizard setup steps to finish installing the Jellyfin server  
11. login to the server using the recently created user (that you created in the wizard), sometimes it will require to restart the Jellyfin.exe app  
12. once logged in, click the 3-line menu button from the top left corner (sometimes reffered to as 'Hamburger')  
13. Click the 'Dashboard' submenu button  
14. scroll down and click the 'Plugins' submenu button  
15. make sure you see plugins tiles there that are ready to be installed (and can't see your 'Template' plugin yet)  
16. make sure the plugins folder exist (in windows: `%UserProfile%\AppData\Local\jellyfin\plugins`)  
  
  
## Download the 'Template' plugin solution
  
1. goto: https://github.com/jellyfin/jellyfin-plugin-template  
2. from the top bar click the 'Code' button and press the 'Download ZIP' sub menu button  
3. once the zip has downloaded - extract it to a folder (lets say on windows: `%UserProfile%\Downloads\pluginTemplate`)  
4. in that folder there should be a folder called: jellyfin-plugin-template-master and in it you should find:  
	- Jellyfin.Plugin.Template
	- .editorconfig
	- .gitignore
	- build.yaml
	- Jellyfin.Plugin.Template.sln
	- LICENSE
	- README.md
	- ...  
5. move the extracted folder (jellyfin-plugin-template-master) to the folder you want the solution to run from (for example: `C:\workspace\jellyfin-plugin-template-master`), we will refer to this folder as: `[TEMPLATE_PLUGIN_PROJECT_ROOT_FOLDER]`  
  
  
## Open the 'Template' plugin solution in latest 'Microsoft Visual Studio'
  
>
> [!NOTE] 
> For this section you can either use: '**Microsoft Visual Studio**',
> or it's free and comunity version counterpart: '**Visual Studio Code**'
>
  
1. open Microsoft Visual Studio  
2. make sure it is upgraded and up-to-date (developers usually use the latest dotnet framework in the unstable server and the template plugin project, wich require the latest Microsoft Visual Studio)  
3. from the welcome screen - click 'Open project or Solutiomn'  
4. from the file browser that is opened - browse to your [TEMPLATE_PLUGIN_PROJECT_ROOT_FOLDER]  
5. select or double click the `'Jellyfin.Plugin.Template.sln'` file  
  
  
## Create a GUID
  
1. open PowerShell (usually: `%SystemRoot%\system32\WindowsPowerShell\v1.0\powershell.exe`)  
2. write the command: `[guid]::NewGuid()`  
3. press enter  
4. copy the long string that is printed as GUID, this is the created GUID  
  
  
## Update strings in the code
  
1. in the 'Microsoft Visual Studio' from the 'solution explorer' panel double click the file: **`'Plugin.cs'`**  
2. in that file find the line: `public override string Name => "Template";`  
3. you may change the 'Template' string to the name you wish your plugin to be named  
4. in that file find the line: `public override Guid Id => Guid.Parse("...");`  
5. replace the content of the string with the GUID you just created  
6. save the file (press Ctrl+S)  
7. in the 'Microsoft Visual Studio' from the 'solution explorer' panel in the `'Configuration'` folder, double click the file: **`'configPage.html'`**  
8. in that file find the line: `pluginUniqueId: '...'`  
9. replace the content of the string with the GUID you just created  
10. save the file (press Ctrl+S)  
  
  
## Compile the solution
  
1. from the 'Microsoft Visual Studio' click on the menu 'Build'  
2. then on the sub menu 'Build Solution'  
3. or alternativly (to steps 1+2) press F6  
  
  
## Copy the dll to the jellyfin plugins folder
  
1. stop the server by killing the executable window of: `C:\Program Files\Jellyfin\Server\Jellyfin.exe`  
2. goto plugins folder (in windows: `%UserProfile%\AppData\Local\jellyfin\plugins`)  
3. create a folder with the plugin name (for instance Template), (in windows you should no have a folder: : `%UserProfile%\AppData\Local\jellyfin\plugins\Template`) lets call it `[TEMPLATE_PLUGIN_ROOT_FOLDER]`  
4. copy your compiled dll plugin file to this folder  
5. you'r dll compiled file will reside in you'r 'Template' project folder under: `[TEMPLATE_PLUGIN_PROJECT_ROOT_FOLDER]\Jellyfin.Plugin.Template\bin\Debug\net5.0` (or the current dotnet framework version JellyFin rely on)  
6. the dll file should be called: Jellyfin.Plugin.Template.dll  
7. if you would like to debug the plugin in the future then also copy the file: Jellyfin.Plugin.Template.pdb  
8. start the server again by executing the file: `C:\Program Files\Jellyfin\Server\Jellyfin.exe`  
9. once the server started, a 'meta.json' file is created in the new Template plugin folder (next to the dll file in the [TEMPLATE_PLUGIN_ROOT_FOLDER] folder)  
10. stop the server  
11. edit the 'meta.json' file with a text editor  
12. find the line: "guid": "...",  
13. replace the GUID string with your created GUID  
14. save the file  
15. start the server again  
  
  
## Check your Template Plugin installed
  
1. goto: http://localhost:8096  
2. login to the server using the recently created user (that you created in the wizard), sometimes it will require to restart the Jellyfin.exe app  
3. once logged in, click the 3-line menu button from the top left corner (sometimes reffered to as 'Hamburger')  
4. Click the 'Dashboard' submenu button  
5. scroll down and click the 'Plugins' submenu button  
6. make sure you see your 'Template' plugin as a tile  
7. if any problem occurr and you can't see you'r Template plugin then goto: `%UserProfile%\AppData\Local\jellyfin\log` and open the latest log file and try to search for the plugin file name and see if there is an error or exception (then google it)  
  
after this goto: https://github.com/jellyfin/jellyfin-plugin-template
to learn more about JellyFin Plugins and how to implement content and functionality into them,
  
Good Luck!
  

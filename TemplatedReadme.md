# Jellyfin.Plugin.Template

This plugin was generated from the [Jellyfin Plugin Template](https://github.com/jellyfin/jellyfin-plugin-template).

You are now ready to continue from [step 4 of the plugin howto](https://github.com/jellyfin/jellyfin-plugin-template#4a-implement-interfaces).

## Development

Jellyfin uses [JPRM](https://github.com/oddstr13/jellyfin-plugin-repository-manager) for building its plugins in CI.
It is not a requirement, but a convenience tool for building, packaging and managing a plugin repo.

[`build.yaml`](./build.yaml) is the config file for jprm, pay especial attention to the `artifacts` list if your plugin produce several dll requirements.
We use this [workflow to update changelogs](https://github.com/jellyfin/jellyfin-meta-plugins/blob/master/.github/workflows/changelog.yaml) before releases.
See also the rest of the [workflows in the template repo](https://github.com/jellyfin/jellyfin-plugin-template/tree/master/.github/workflows) for how we automate the plugin releases.

```shell
# Install JPRM
pipx install jprm

# Build your plugin
jrpm plugin build
```

You also need the `dotnet` command-line tool installed, along with the appropriate .net framework version.

Plugin GUID: `eb5d7894-8eef-4b36-aa6f-5d124e828ce1`

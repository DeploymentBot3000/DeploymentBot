# Helldivers 2 Deployment Bot

This is a bot for organizing deployments for <http://discord.gg/505th>.

## Installation

The bot needs to be hosted and requires a MySQL database for storage.

The bot discord app needs to be configured for custom guild invite and invited to the server.

Go to <https://discord.com/developers/applications> and create a new application.

Under Installation tab:

* Installation Contexts: Guild Install
* Install Link: None

Under Oauth2 tab, in `OAuth2 URL Generator` select `bot` and in `Integration Type` select `Guild install` and you should get a link to copy from `Generated URL`. This is the link to invite the bot to your server.

The bot then must be given permission on the channels/categories required for operation (see below). Since some of these permissions are destructive, e.g. `Manage Channels`, and since the bot doesn't need to interact with any other channels, we do not request any global permissions.

## Configuration

Some aspects of the bot can be configured at runtime, but many are hardcoded in config files.

See `src/config_{dev/prod}.ts` and `src/config/discord_server_{dev/prod}.ts`.

Further more, a secrets file needs to be created in the root directory of the project (same level as the src directory) with a copy of `src/config/secrets.sample.json`, containing the bot token and database connection details.

## Permissions

Below are the required permissions for the bot.

### For the text channels

For the text channels where the hot drops embed goes, where departure notices go, where the deployment signups go, these are the required permissions.

* View Channels
* Send Messages
* Embed Links
* Read Message History

### For the vc categories

For the categories under which you want the bot to create/delete voice channels, these are the required permissions to create/delete the channels and to delegate permissions to the host/participants.

* View Channels
* Manage Channels
* Create Invite
* Connect
* Speak
* Video
* Use Voice Activity
* Move Members

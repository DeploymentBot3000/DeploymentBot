import { ButtonStyle } from "discord.js";
import { discord_server_config_dev } from "./config/discord_server_dev.js";
import { secrets } from "./config/secrets_loader.js";

export const config_dev = {
    token: secrets.discord_app_token,
    prefix: "-",
    logLevel: 'DEBUG',
    registerCommands: false,
    dropSchema: false, // Clears out the database on every restart - only enable for the first time
    synchronizeDatabase: false,
    database: {
        type: "mysql",
        host: secrets.db_host,
        port: 3306,
        username: secrets.db_username,
        password: secrets.db_password,
        database: secrets.db_name,
        extra: { charset: "utf8mb4_unicode_ci" }
    },
    guildId: discord_server_config_dev.guild_id,

    hostRoles: discord_server_config_dev.roles.host_role_ids,
    deniedRoles: discord_server_config_dev.roles.denied_role_ids,

    departureChannel: discord_server_config_dev.channels.departure_channel_id,
    log_channel_id: discord_server_config_dev.channels.log_channel_id,

    // Min players required for a hot drop (including the host)
    min_players: 1,
    // Max players required for a hot drop (including the host)
    max_players: 4,

    // Min required lead time for deployments in minutes.
    // Deployments must be posted at least this many minutes into the future.
    // E.g. if it is 12PM and the lead time is 15 minutes, then a new deployment must start after 12:15PM.
    min_deployment_lead_time_minutes: 4,

    // How long after deployment end time should it be deleted.
    deployment_delete_time_minutes: 2,

    // Time before deployment to send departure notice.
    departure_notice_lead_time_minutes: 2,

    // The length of a deployment from start time to end time.
    deployment_duration_minutes: 4,

    backupEmoji: "🔄",
    queueMaxes: {
        hosts: 50,
        players: 150,
    },
    editEmoji: "🔧",
    roles: [
        {
            name: "Fireteam",
            emoji: "⚔️"
        },
    ],
    embeds: {
        presets: {
            success: {
                thumbnail: "https://img.icons8.com/bubbles/200/checkmark.png",
            },
            error: {
                thumbnail: "https://img.icons8.com/bubbles/200/error.png",
            },
            info: {
                thumbnail: "https://img.icons8.com/bubbles/200/info--v1.png",
            },
            default: {
                title: null as string,
                description: null as string,
                color: "#00ffff",
                thumbnail: null as string,
            }
        },
        panel: {
            title: "Create a new deployment",
            description: "You’ve survived this long, so what’s one more chaotic deployment? If you feel bold enough to lead another team into almost-certain disaster, click the button below to open the 'Create Deployment' modal. Remember, there's no backing out and make sure you come back in one piece!",
            color: "#00ffff"
        },
    },
    buttons: {
        newDeployment: {
            label: "New Deployment",
            style: ButtonStyle.Primary,
            emoji: "🔔"
        },
        editDeployment: {
            label: "Edit",
            style: ButtonStyle.Secondary
        },
        deleteDeployment: {
            label: "Delete",
            style: ButtonStyle.Danger
        },
        host: {
            label: "Host",
            style: ButtonStyle.Success
        },
        join: {
            label: "Join",
            style: ButtonStyle.Success
        },
        leave: {
            label: "Leave",
            style: ButtonStyle.Danger
        }
    },
    // Button cooldown is temporarily disabled to stress test the strike queue
    // panel deferral.
    buttonCooldownSeconds: 0,
    selectMenuCooldownSeconds: 5,

    discord_server: discord_server_config_dev,
};

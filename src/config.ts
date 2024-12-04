import secrets from "./config/secrets.js"
import discord_server from "./config/discord_server.js"

export default {
    token: secrets.discord_app_token,
    prefix: "-",
    debugMode: true,
    resetCommands: false,
    synchronizeCommands: false,
    resetDatabase: false, // Clears out the database on every restart - only enable for the first time
    synchronizeDatabase: false,
    database: {
        type: "mysql",
        host: secrets.db_host,
        port: 3306,
        username: secrets.db_username,
        password: secrets.db_password,
        database: secrets.db_name,
    },
    satus: { text: "/bugreport"},
    guildId: discord_server.guild_id,

    verifiedRoleId: discord_server.roles.verified_role_id,
    hostRole: discord_server.roles.host_role_id,
    blacklistedRoles: discord_server.roles.blacklisted_role_ids,
    
    departureChannel: discord_server.channels.departure_channel_id,
    bugReportChannelId: discord_server.channels.bug_report_channel_id,
    log_channel_id: discord_server.channels.log_channel_id,

    channels: discord_server.deployment_channels,

    vcCategory: discord_server.vc_category,

    // Min players required for a hot drop (including the host)
    min_players: 4,
    // Max players required for a hot drop (including the host)
    max_players: 4,

    // Min required lead time for deployments in minutes.
    min_deployment_lead_time_minutes: 15,

    backupEmoji: "🔄",
    queueMaxes: {
        hosts: 50,
        players: 200,
    },
    editEmoji: "🔧",
    roles: [
        {
            name: "Offense",
            emoji: "⚔️"
        },
        {
            name: "Mechanized infantry",
            emoji: "🚜"
        },
        {
            name: "Support",
            emoji: "🏹"
        },
        {
            name: "Defence",
            emoji: "🛡️"
        },
        {
            name: "Scout",
            emoji: "🪖"
        }
    ],
    embeds: {
        presets: {
            success: {
                thumbnail: "https://img.icons8.com/bubbles/200/checkmark.png",
            },
            error: {
                thumbnail: "https://img.icons8.com/bubbles/200/error.png",
            },
            loading: {
                thumbnail: "https://img.icons8.com/bubbles/200/loading-bar.png",
            },
            info: {
                thumbnail: "https://img.icons8.com/bubbles/200/info--v1.png",
            },
            default: {
                title: null,
                description: null,
                color: "#00ffff",
                author: {
                    name: null,
                    iconURL: null
                },
                footer: {
                    text: null,
                    iconURL: null
                },
                thumbnail: null,
                image: null,
                timestamp: true
            }
        },
        cooldown: {
            title: "Cooldown",
            description: ":x: **You can use this command again {timestamp}**"
        },
        panel: {
            title: "Create a new deployment",
            description: "You’ve survived this long, so what’s one more chaotic deployment? If you feel bold enough to lead another team into almost-certain disaster, click the button below to open the 'Create Deployment' modal. Remember, there's no backing out and make sure you come back in one piece!",
            color: "#00ffff"
        },
        deploymentsCommand: {
            title: {
                default: "⚠️・Upcoming Deployments・⚠️",
                noDeployments: "⛔┃No Upcoming Deployments"
            },
            footer: {
                text: '505th "Resurgence" Regiment',
            }
        }
    },
    buttons: {
        newDeployment: {
            label: "New Deployment",
            style: "Primary",
            emoji: "🔔"
        },
        editDeployment: {
            label: "Edit",
            style: "Secondary"
        },
        deleteDeployment: {
            label: "Delete",
            style: "Danger"
        },
        host: {
            label: "Host",
            style: "Success"
        },
        join: {
            label: "Join",
            style: "Success"
        },
        leave: {
            label: "Leave",
            style: "Danger"
        }
    },
    buttonCooldown: 5
}

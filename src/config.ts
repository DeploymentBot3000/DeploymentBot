export default {
    token: "na", // Bot token - you can access it from the Discord Developer Portal: https://discord.com/developers/applications
    prefix: "-",
    debugMode: true,
    resetCommands: false,
    synchronizeCommands: false,
    resetDatabase: false, // Clears out the database on every restart - only enable for the first time
    synchronizeDatabase: false,
    database: {
        type: "mysql",
        host: "na",
        port: 3306,
        username: "na",
        password: "na",
        database: "na"
    },
    satus: { text: "/bugreport"},
    verifiedRoleId: "1312957075214696458",
    guildId: "1312898325074153543",
    departureChannel: "1312957214377512961",
    bugReportChannelId: "1312957290273570868",
    vcCategory: "1312898325074153545",
    loggingChannels: ["1312956393116008509", "1312956473164435476"],
    backupEmoji: "🔄",
    hostRole: "1312955795989860542",
    blacklistedRoles: ["1312956640227496079"],
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
    channels: [
        {
            name: "Battalion - For those who just want to serve anywhere, anytime.",
            emoji: "🏴‍☠️",
            channel: "1313167910671351808"
        },
        {
            name: "EU — Ready to fight across the European front!",
            emoji: "🇪🇺",
            channel: "1313167678332211220"
        },
        {
            name: "NA — North American chaos incoming!",
            emoji: "🇺🇸",
            channel: "1313167659759570974"
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

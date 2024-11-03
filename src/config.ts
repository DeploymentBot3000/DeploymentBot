export default {
    token: "na", // Bot token - you can access it from the Discord Developer Portal: https://discord.com/developers/applications
    prefix: "-",
    debugMode: true,
    resetDatabase: true, // Clears out the database on every restart - only enable for the first time
    synchronizeDatabase: false,
    database: {
        type: "mysql",
        host: "na",
        port: 3306,
        username: "na",
        password: "na",
        database: "na"
    },
    verifiedRoleId: "1300670595918332007",
    guildId: "1218615560049397770",
    departureChannel: "1297304177021685821",
    vcCategory: "1297303880706818109",
    loggingChannel: "1297709020534013953",
    backupEmoji: "<:Backup:1289325583905456251>",
    hostRole: "1296482820067295284",
    editEmoji: "🔧",
    roles: [
        {
            name: "Offense",
            emoji: "<:Offence:1289325516494737512>"
        },
        {
            name: "Mechanized infantry",
            emoji: "<:Mechinf:1289325461238841405>"
        },
        {
            name: "Support",
            emoji: "<:Support:1289325497049944136>"
        },
        {
            name: "Defence",
            emoji: "<:Defence:1289325447850623087>"
        },
        {
            name: "Scout",
            emoji: "<:Scout:1289325477789696120>"
        }
    ],
    channels: [
        {
            name: "Battalion - For those who just want to serve anywhere, anytime.",
            emoji: "🏴‍☠️",
            channel: "1297305928449790033"
        },
        {
            name: "EU — Ready to fight across the European front!",
            emoji: "🇪🇺",
            channel: "1297305445903503422"
        },
        {
            name: "NA — North American chaos incoming!",
            emoji: "🇺🇸",
            channel: "1297305575348109434"
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
        queuePanel: {
            title: "Hot Drop Queue",
            description: "If you are interested in hosting a hot drop deployment, please click on **HOST**🚀\nIf you are interested in joining a hot drop deployment, please click on **JOIN**📝\n\Don't forget to leave the queue if you are no longer available for a hot drop, by clicking **LEAVE**🚫\n\n\n🚨🚨🚨\nAfter being deployed, you have **15 MINUTES** to join the correct voice channel!\n🚨🚨🚨\n\nHot drop deployments are urgent deployments, where random divers from the Queue Panel get selected at the listed interval of time below and sent to their hellpods!",
            color: "#00ffff"
        },
        deploymentsCommand: {
            title: {
                default: "⚠️・Upcoming Deployments・⚠️",
                noDeployments: "⛔┃No Upcoming Deployments"
            },
            footer: {
                text: '101st "Hell" Battalion',
                image: "https://cdn.discordapp.com/attachments/1224638196902531082/1280659026610491485/MOSHED-2024-9-2-22-45-12.gif"
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
    useNicknames: true
}

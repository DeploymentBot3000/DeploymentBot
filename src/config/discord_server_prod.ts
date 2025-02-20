export const discord_server_config_prod = {
    guild_id: "1295828336341422091",
    roles: {
        host_role_ids: [
            "1315040207292076032",  // High Command
            "1310134571190452264",  // Officer
            "1310135497682714645",  // NCO
            "1310091934672490548",  // Specialist
        ],
        denied_role_ids: [] as string[],
        lfg_role_id: "1311119756019109888",
        verified_role_id: "1310055322945192096",
    },
    channels: {
        departure_channel_id: "1310318744538447902",
        log_channel_id: "1328895830333198336",
        error_log_channel_id: "1328895942643945594",
    },
    deployment_channel: "1328890224985641021",
    hotdrop_vc_category_prefix: "Active Hot Drops",
    hotdrop_vc_category_max_channels: 50,
    strike_vc_category_prefix: "Active Hot Drops",
    strike_vc_category_max_channels: 50,
    clear_vc_channels_every_minutes: 10,
};

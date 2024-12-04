import { Snowflake } from "discord.js";
import config from "../config.js";
import Settings from "../tables/Settings.js";
import { debug, log } from "./logger.js";

enum SettingKey {
    min_players = "min_players",
    max_players = "max_players",
    min_deployment_lead_time_minutes = "min_deployment_lead_time_minutes",
}

async function getSetting<ValueType>(key: SettingKey, defaultValue: ValueType): Promise<ValueType> {
    const setting: Settings = await Settings.findOneBy({ guild_id: config.guildId, key: key });
    if (setting) {
        const typedValue: ValueType = JSON.parse(setting.value);
        debug(`Retrieved setting: ${key} with value: ${typedValue}`);
        return typedValue;
    }
    debug(`Returning default value for setting: ${key}, value: ${defaultValue}`);
    return defaultValue;
}

export async function getMinPlayers() {
    return getSetting(SettingKey.min_players, config.min_players);
}

export async function getMaxPlayers() {
    return getSetting(SettingKey.max_players, config.max_players);
}

export async function getMinDeploymentLeadTimeMinutes() {
    return getSetting(SettingKey.min_deployment_lead_time_minutes, config.min_deployment_lead_time_minutes);
}

export async function setSetting<ValueType>(guild_id: Snowflake, key: SettingKey, value: ValueType) {
    let setting: Settings = await Settings.findOneBy({ guild_id: guild_id, key: key });
    if (!setting) {
        setting = new Settings();
        setting.guild_id = config.guildId;
        setting.key = key;
    }
    setting.value = JSON.stringify(value);
    setting.save();
    debug(`Updated setting ${key} to ${value}`);
}

// DO NOT SUBMIT: Move this to slash command file.
async function setSettingStr(guild_id: Snowflake, key: string, valueJson: string) {
    if (!(<any>Object).values(SettingKey).includes(key)) {
        throw new Error(`${key} is not a valid option key.`);
    }
    const typedKey: SettingKey = key as SettingKey;

    return setSetting(guild_id, typedKey, JSON.parse(valueJson));
}

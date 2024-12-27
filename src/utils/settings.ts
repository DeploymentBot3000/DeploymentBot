import { Snowflake } from "discord.js";
import Settings from "../tables/Settings.js";
import { debug } from "./logger.js";
import { Duration } from "luxon";

enum SettingKey {
    deployment_time = "deployment_time",
}

async function getSetting(guildId: Snowflake, name: SettingKey, defaultValue: string): Promise<string> {
    if (!(<any>Object).values(SettingKey).includes(name)) {
        throw new Error(`${name} is not a valid option key.`);
    }
    const setting: Settings = await Settings.findOneBy({ guildId: guildId, name: name });
    if (setting) {
        debug(`Retrieved setting: ${name} with value: ${setting.value}`);
        return setting.value;
    }
    debug(`Returning default value for setting: ${name}, value: ${defaultValue}`);
    return defaultValue;
}

async function setSetting(guildId: Snowflake, name: SettingKey, value: string) {
    if (!(<any>Object).values(SettingKey).includes(name)) {
        throw new Error(`${name} is not a valid option key.`);
    }
    let setting: Settings = await Settings.findOneBy({ guildId: guildId, name: name });
    if (setting) {
        setting.value = value;
        setting.save();
        debug(`Updated setting: ${name} to value: ${value}`);
    } else {
        setting = new Settings();
        setting.guildId = guildId;
        setting.name = name;
        setting.value = value;
        setting.save();
        debug(`Created setting: ${name} with value: ${value}`);
    }
}

export async function getDeploymentTimeSetting(guildId: Snowflake) {
    const deplymentTime = await getSetting(guildId, SettingKey.deployment_time, Duration.fromDurationLike({ 'minutes': 10 }).toMillis().toString());
    return Duration.fromMillis(Number(deplymentTime));
}

export async function setDeploymentTimeSetting(guildId: Snowflake, deploymentTime: Duration) {
    await setSetting(guildId, SettingKey.deployment_time, deploymentTime.toMillis().toString());
}

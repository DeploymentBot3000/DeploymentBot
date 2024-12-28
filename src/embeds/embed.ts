import { ColorResolvable, EmbedBuilder } from "discord.js";
import config from "../config.js";

interface EmbedConfigOptions {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
}

export function buildErrorEmbed() {
    return buildEmbed(config.embeds.presets.error);
}

export function buildInfoEmbed() {
    return buildEmbed(config.embeds.presets.info);
}

export function buildSuccessEmbed() {
    return buildEmbed(config.embeds.presets.success);
}

export function buildEmbed(options: EmbedConfigOptions) {
    const embed = new EmbedBuilder();

    const defaultPreset = config.embeds.presets.default;

    const format = (string: string) => {
        if (!string) return string;
        if (string == "N/A") return null;
        return string;
    };

    embed.setTitle(format(options.title || defaultPreset.title));
    embed.setDescription(format(options.description || defaultPreset.description));
    embed.setColor(options.color as ColorResolvable || defaultPreset.color as ColorResolvable);
    embed.setThumbnail(options.thumbnail || defaultPreset.thumbnail);

    return embed.setTimestamp();
}


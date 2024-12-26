import { ButtonBuilder, ColorResolvable, EmbedBuilder } from "discord.js";
import config from "../../config.js";

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

export function buildPanelEmbed() {
    return buildEmbed(config.embeds.panel);
}

function buildEmbed(options: EmbedConfigOptions) {
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

export function buildButton(name: keyof typeof config.buttons) {
    const button = new ButtonBuilder();
    const buttonConfig = config.buttons[name];
    if (buttonConfig.label) {
        button.setLabel(buttonConfig.label);
    }
    button.setStyle(buttonConfig.style);
    button.setCustomId(name.replace(/\s/g, "_"));

    if ('emoji' in buttonConfig) {
        button.setEmoji(buttonConfig.emoji);
    }
    return button;
}

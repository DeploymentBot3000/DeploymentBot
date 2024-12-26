import { ButtonBuilder, EmbedBuilder } from "discord.js";
import config from "../../config.js";

export function buildErrorEmbed() {
    return buildEmbed({ preset: 'error' });
}

export function buildInfoEmbed() {
    return buildEmbed({ preset: 'info' });
}

export function buildSuccessEmbed() {
    return buildEmbed({ preset: 'success' });
}

export function buildPanelEmbed() {
    return buildEmbed({ name: 'panel' });
}

function buildEmbed({ name, preset }: { name?: string, preset?: string }) {
    const embed = new EmbedBuilder();

    if (!name && !preset) throw new Error("You must provide a name or a preset to build an embed");

    const embeds = config.embeds;
    const presets = embeds.presets;
    const defaultPreset = presets.default;

    const format = (string: string) => {
        if (!string) return string;
        if (string == "N/A") return null;
        return string;
    };
    
    embed.setTitle(format(embeds[name]?.title || presets[preset]?.title || defaultPreset.title))
    embed.setDescription(format(embeds[name]?.description || presets[preset]?.description || defaultPreset.description))
    embed.setColor(embeds[name]?.color || presets[preset]?.color || defaultPreset.color)
    embed.setFooter({ text: format(embeds[name]?.footer?.text || presets[preset]?.footer?.text || defaultPreset.footer.text), iconURL: embeds[name]?.footer?.iconURL || presets[preset]?.footer?.iconURL || defaultPreset.footer.iconURL })
    embed.setThumbnail(embeds[name]?.thumbnail || presets[preset]?.thumbnail || defaultPreset.thumbnail)
    embed.setImage(embeds[name]?.image || presets[preset]?.image || defaultPreset.image)
    embed.setAuthor({ name: format(embeds[name]?.author?.name || presets[preset]?.author?.name || defaultPreset.author.name), iconURL: embeds[name]?.author?.iconURL || presets[preset]?.author?.iconURL || defaultPreset.author.iconURL })
    if (embeds[name]?.timestamp != undefined ? embeds[name]?.timestamp : presets[preset]?.timestamp != undefined ? presets[preset]?.timestamp : defaultPreset.timestamp) embed.setTimestamp()

    return embed;
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

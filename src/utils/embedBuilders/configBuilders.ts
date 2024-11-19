import {ButtonBuilder, ButtonStyle, EmbedBuilder} from "discord.js";
import config from "../../config.js";

/**
 * @function buildEmbed
 * @description A function that builds an embed
 * @param {string} name The name of the embed
 * @param {string} preset The preset of the embed
 * @param {EmbedBuilder} embed The embed to build
 * @param {Object} placeholders The placeholders to replace in the embed
 * @returns {EmbedBuilder} The built embed
 * @example
 * buildEmbed({ name: "cooldown", preset: "error", placeholders: { timestamp: "<t:1630000000:R>" } });
 */
export function buildEmbed({ name, preset, embed, placeholders }: { name?: string, preset?: string, embed?: EmbedBuilder, placeholders?: { [key: string]: string }}) {
    if (!embed) embed = new EmbedBuilder();

    if (!name && !preset) throw new Error("You must provide a name or a preset to build an embed");

    const { embeds } = config;
    const { presets } = embeds;
    const { default: defaultPreset } = presets;

    const format = (string: string) => {
        if (!string) return string;
        if (string == "N/A") return null;
        if (placeholders) {
            for (const [key, value] of Object.entries(placeholders)) {
                string = string.replace(new RegExp(`{${key}}`, "g"), value);
            }
        }
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

/**
 * @function buildButton
 * @description A function that builds a button
 * @param {string} name The name of the button
 * @returns {ButtonBuilder} The built button
 * @example
 * buildButton("example");
 */
export function buildButton(name: string) {
    const button = new ButtonBuilder();

    if (config.buttons[name].label) button.setLabel(config.buttons[name].label)
    if (config.buttons[name].url) {
        button.setURL(config.buttons[name].url)
        button.setStyle(ButtonStyle.Link)
    } else {
        button.setStyle(config.buttons[name].style || "Primary")
        button.setCustomId(name.replace(/\s/g, "_"))
    }

    if (config.buttons[name].emoji) button.setEmoji(config.buttons[name].emoji)

    return button;
}
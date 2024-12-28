import { ButtonBuilder } from "discord.js";
import config from "../config.js";


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

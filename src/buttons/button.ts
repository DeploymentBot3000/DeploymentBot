import { ButtonBuilder, ButtonInteraction } from "discord.js";
import { Duration } from "luxon";
import config from "../config.js";
import { PermissionsConfig } from "../utils/permissions.js";


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

export default class Button {
    public id: string;
    public cooldown?: Duration;
    public permissions: PermissionsConfig;
    public callback: (params: {
        interaction: ButtonInteraction;
    }) => Promise<void>;
    public constructor({ id, cooldown, permissions, callback }: {
        id: string; cooldown: Duration; permissions: PermissionsConfig; callback: (params: {
            interaction: ButtonInteraction;
        }) => Promise<void>;
    }) {
        this.id = id;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.callback = callback;
    }
}

import { ButtonBuilder, ButtonInteraction, PermissionsString } from "discord.js";
import { Duration } from "luxon";
import { requiredRolesType } from "../classes/Command.js";
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

export default class Button {
    public id: string;
    public cooldown?: Duration;
    public permissions?: PermissionsString[];
    /**
     * The role required to run this command
     * @type {requiredRolesType}
     * @example [{ role: "1234567890", required: true }, { role: "0987654321", required: false }]
     * @description The roles required to run the command.
     * If required is true, the user must have the role to run the command.
     * Otherwise the user can run the command with a higher role.
     */
    public requiredRoles?: requiredRolesType;
    public blacklistedRoles?: string[];
    public callback: (params: {
        interaction: ButtonInteraction;
    }) => Promise<void>;
    public constructor({ id, cooldown, permissions, requiredRoles, blacklistedRoles, callback }: {
        id: string; cooldown: Duration; permissions: PermissionsString[]; requiredRoles: requiredRolesType; blacklistedRoles: string[]; callback: (params: {
            interaction: ButtonInteraction;
        }) => Promise<void>;
    }) {
        this.id = id;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.requiredRoles = requiredRoles;
        this.blacklistedRoles = blacklistedRoles;
        this.callback = callback;
    }
}

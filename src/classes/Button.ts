import { ButtonInteraction, PermissionsString } from "discord.js";
import { requiredRolesType } from "./Slashcommand.js";
import {buildEmbed} from "../utils/configBuilders.js";

/**
 * @class Button
 * @description A class that represents a button
 * @param {string} id The id of the button
 * @param {number} cooldown The cooldown of the button
 * @param {PermissionsString[]} permissions The permissions required to run the button
 * @param {requiredRolesType} requiredRoles The roles required to run the button
 * @param {function} func The function to run when the button is used
 */
export default class Button {
    private static lastRun = new Map<string, number>();
    public id: string;
    public cooldown?: number;
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
    public function: (params: {
        interaction: ButtonInteraction;
    }) => void;
    public constructor({ id, cooldown, permissions, requiredRoles, func }: { id: string, cooldown: number, permissions: PermissionsString[], requiredRoles: requiredRolesType, func: (params: {
        interaction: ButtonInteraction;
    }) => void }) {
        this.id = id;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.requiredRoles = requiredRoles;
        const originalFunc = func;
        this.function = async (params) => {
            const canRun = await this.checkCooldown(params.interaction.user.id);
            if (!canRun) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Please wait before using this button again");
                return await params.interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            return originalFunc(params);
        };
    }

    public async checkCooldown(userId: string): Promise<boolean> {
        if (!this.cooldown) return true;
        
        const last = Button.lastRun.get(`${this.id}-${userId}`);
        const now = Date.now();
        
        if (!last || now - last >= this.cooldown * 1000) {
            Button.lastRun.set(`${this.id}-${userId}`, now);
            return true;
        }
        
        return false;
    }
}
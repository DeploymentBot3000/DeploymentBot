import { ApplicationCommandType, ContextMenuCommandInteraction, PermissionsString } from "discord.js";
import { requiredRolesType } from "./Slashcommand.js";

/**
 * @class ContextMenu
 * @description A class that represents a context menu
 * @param {string} name The name of the context menu
 * 
 * @param {number} cooldown The cooldown of the button
 * @param {PermissionsString[]} permissions The permissions required to run the button
 * @param {requiredRolesType} requiredRoles The roles required to run the button
 * @param {function} callback The function to run when the button is used
 */
export default class ContextMenu { 
    public name: string; 
    public type: ApplicationCommandType;
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
    public blacklistedRoles?: string[];
    public callback: (params: {
        interaction: ContextMenuCommandInteraction;
    }) => void;
    public constructor({ name, type, cooldown, permissions, requiredRoles, blacklistedRoles, callback }: {
        name: string, type: ApplicationCommandType, cooldown: number, permissions: PermissionsString[], requiredRoles: requiredRolesType, blacklistedRoles: string[], callback: (params: {
        interaction: ContextMenuCommandInteraction;
    }) => void }) {
        this.name = name;
        this.type = type;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.requiredRoles = requiredRoles;
        this.blacklistedRoles = blacklistedRoles;
        this.callback = callback;
    }
}
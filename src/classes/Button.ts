import { ButtonInteraction, PermissionsString } from "discord.js";
import { requiredRolesType } from "./Slashcommand.js";

/**
 * @class Button
 * @description A class that represents a button
 * @param {string} id The id of the button
 * @param {number} cooldown The cooldown of the button
 * @param {PermissionsString[]} permissions The permissions required to run the button
 * @param {requiredRolesType} requiredRoles The roles required to run the button
 * @param {function} func The function to run when the button is used
 */
export default class {
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
        this.function = func;
    }
}
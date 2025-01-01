import { AnySelectMenuInteraction } from "discord.js";
import { Duration } from "luxon";
import { PermissionsConfig } from "../utils/permissions.js";

/**
 * @class SelectMenu
 * @description A class that represents a select menu
 * @param {string} id The id of the select menu
 * @param {number} cooldown The cooldown of the select menu
 * @param {PermissionsString[]} permissions The permissions required to run the select menu
 * @param {requiredRolesType} requiredRoles The roles required to run the select menu
 * @param {function} func The function to run when the select menu is used
 */
export default class SelectMenu {
    public id: string;
    public cooldown?: Duration;
    public permissions: PermissionsConfig;
    public callback: (params: {
        interaction: AnySelectMenuInteraction;
    }) => Promise<void>;
    public constructor({ id, cooldown, permissions, callback }: {
        id: string, cooldown: Duration, permissions: PermissionsConfig, callback: (params: {
        interaction: AnySelectMenuInteraction;
        }) => Promise<void>
    }) {
        this.id = id;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.callback = callback;
    }
}
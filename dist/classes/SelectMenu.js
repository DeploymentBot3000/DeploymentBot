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
    id;
    cooldown;
    permissions;
    /**
     * The role required to run this command
     * @type {requiredRolesType}
     * @example [{ role: "1234567890", required: true }, { role: "0987654321", required: false }]
     * @description The roles required to run the command.
     * If required is true, the user must have the role to run the command.
     * Otherwise the user can run the command with a higher role.
     */
    requiredRoles;
    function;
    constructor({ id, cooldown, permissions, requiredRoles, func }) {
        this.id = id;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.requiredRoles = requiredRoles;
        this.function = func;
    }
}

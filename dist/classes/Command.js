/**
 * @class Command
 * @description A class that represents a command
 * @param {string} name The name of the command
 * @param {string} description The description of the command
 * @param {string[]} aliases The aliases of the command
 * @param {number} cooldown The cooldown of the command
 * @param {PermissionsString[]} permissions The permissions required to run the command
 * @param {requiredRolesType} requiredRoles The roles required to run the command
 * @param {function} func The function to run when the command is used
 */
export default class Command {
    name;
    description;
    aliases;
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
    constructor({ name, description, aliases, cooldown, permissions, requiredRoles, func }) {
        this.name = name;
        this.description = description;
        this.aliases = aliases;
        this.cooldown = cooldown;
        this.permissions = permissions;
        this.requiredRoles = requiredRoles;
        this.function = func;
    }
}

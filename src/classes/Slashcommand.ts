import { ApplicationCommandOption, AutocompleteInteraction, CacheType, ChatInputCommandInteraction, CommandInteractionOptionResolver, PermissionsString } from "discord.js";

type OmittedCommandInteractionOptionResolver = Omit<CommandInteractionOptionResolver<CacheType>, "getMessage" | "getFocused">;
export type requiredRolesType = { role: string, required: Boolean }[];

/**
 * @class Slashcommand
 * @description A class that represents a slash command
 * @param {string} name The name of the command
 * @param {string} description The description of the command
 * @param {PermissionsString[]} permissions The permissions required to run the command
 * @param {requiredRolesType} requiredRoles The roles required to run the command
 * @param {number} cooldown The cooldown of the command
 * @param {ApplicationCommandOption[]} options The options of the command
 * @param {function} func The function to run when the command is used
 * @param {function} autocomplete The function to run when the command is autocompleted
 */
export default class Slashcommand {
    public name: string;
    public description: string;
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
    public cooldown?: number;
    public options: ApplicationCommandOption[];
    public function: (params: {
        interaction: ChatInputCommandInteraction;
        options: OmittedCommandInteractionOptionResolver
    }) => void;
    public autocomplete?: (params: {
        interaction: AutocompleteInteraction;
    }) => void;
    public constructor({ name, description, permissions, requiredRoles, blacklistedRoles, cooldown, options, func, autocomplete }: { name: string, description: string, permissions: PermissionsString[], requiredRoles: requiredRolesType, cooldown: number, options: ApplicationCommandOption[], blacklistedRoles: string[], func: (params: {
        interaction: ChatInputCommandInteraction;
        options: OmittedCommandInteractionOptionResolver;
    }) => void, autocomplete?: (params: {
        interaction: AutocompleteInteraction;
    }) => void
    }) {
        this.name = name;
        this.description = description;
        this.permissions = permissions;
        this.requiredRoles = requiredRoles;
        this.blacklistedRoles = blacklistedRoles;
        this.cooldown = cooldown;
        this.options = options;
        this.function = func;
        this.autocomplete = autocomplete;
    }
}
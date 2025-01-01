import { ApplicationCommandOption, AutocompleteInteraction, CacheType, ChatInputCommandInteraction, CommandInteractionOptionResolver } from "discord.js";
import { PermissionsConfig } from "../utils/permissions.js";

type OmittedCommandInteractionOptionResolver = Omit<CommandInteractionOptionResolver<CacheType>, "getMessage" | "getFocused">;

/**
 * @class Slashcommand
 * @description A class that represents a slash command
 * @param {string} name The name of the command
 * @param {string} description The description of the command
 * @param {PermissionsString[]} permissions The permissions required to run the command
 * @param {requiredRolesType} requiredRoles The roles required to run the command
 * @param {ApplicationCommandOption[]} options The options of the command
 * @param {function} func The function to run when the command is used
 * @param {function} autocomplete The function to run when the command is autocompleted
 */
export default class Command {
    public name: string;
    public description: string;
    public permissions: PermissionsConfig;
    public options: ApplicationCommandOption[];
    public callback: (params: {
        interaction: ChatInputCommandInteraction;
        options: OmittedCommandInteractionOptionResolver
    }) => Promise<void>;
    public autocomplete?: (params: {
        interaction: AutocompleteInteraction;
    }) => void;
    public constructor({ name, description, permissions, options, callback, autocomplete }: {
        name: string, description: string, permissions: PermissionsConfig, options: ApplicationCommandOption[], callback: (params: {
            interaction: ChatInputCommandInteraction;
            options: OmittedCommandInteractionOptionResolver;
        }) => Promise<void>, autocomplete?: (params: {
            interaction: AutocompleteInteraction;
        }) => void
    }) {
        this.name = name;
        this.description = description;
        this.permissions = permissions;
        this.options = options;
        this.callback = callback;
        this.autocomplete = autocomplete;
    }
}
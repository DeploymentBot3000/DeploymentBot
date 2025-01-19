import { ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import Command from "../classes/Command.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { editReplyWithSuccess, replyWithError } from "../utils/interaction_replies.js";
import { setSetting, SettingKey } from "../utils/settings.js";
import { isEnumValue } from "../utils/typescript.js";
import { parseDeploymentTimeString } from "./set_deployment_time.js";

export const SetSettingCommand = new Command({
    name: 'set-setting',
    description: 'Set the value for a setting',
    permissions: {
        requiredPermissions: ['Administrator']
    },
    options: [
        {
            name: 'name',
            description: 'The name of the setting',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
        {
            name: 'value',
            description: 'The value of the setting',
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    autocomplete: async function ({ interaction }: { interaction: AutocompleteInteraction<'cached'> }) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name == 'name') {
            const settingsNames = Object.keys(SettingKey).filter(v => isNaN(Number(v)));
            const choices = settingsNames.filter(s => s.startsWith(focusedOption.value));
            await interaction.respond(
                choices.map(choice => ({ name: choice, value: choice })),
            );
        }
    },
    callback: async function ({ interaction }: { interaction: ChatInputCommandInteraction<'cached'> }) {
        const settingName = interaction.options.getString('name');
        const rawValue = interaction.options.getString('value');

        if (!isEnumValue(SettingKey, settingName)) {
            replyWithError(interaction, `Invalid setting: ${settingName}`);
            return;
        }
        const setter = _kSetters.get(settingName);
        if (!setter) {
            replyWithError(interaction, `Missing setter for setting: ${settingName}`);
            return;
        }

        const parsedValue = setter.parseValue(rawValue);
        if (parsedValue instanceof Error) {
            await replyWithError(interaction, parsedValue.message);
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        if (setter.storeValue) {
            await setter.storeValue(parsedValue);
        } else {
            await setSetting(interaction.guild.id, settingName, rawValue);
        }

        await editReplyWithSuccess(interaction, `Updated setting: ${settingName} to value: ${rawValue}`);
    }
});

interface SettingSetter {
    parseValue(rawValue: string): any | Error;
    storeValue?(parsedValue: any): Promise<void>;
};
const _kSetters = new Map<SettingKey, SettingSetter>();

// Custom setters

const DeploymentTimeSetter = new class implements SettingSetter {
    parseValue(rawValue: string): any | Error {
        return parseDeploymentTimeString(rawValue);
    }
    async storeValue(parsedValue: any): Promise<void> {
        return HotDropQueue.getHotDropQueue().setDeploymentTime(parsedValue);
    }
};

_kSetters.set(SettingKey.deployment_time, DeploymentTimeSetter);

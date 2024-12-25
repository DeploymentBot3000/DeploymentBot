import { ChatInputCommandInteraction, PermissionFlagsBits, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Duration } from "luxon";
import ms from "ms";
import { CommandV2 } from "../classes/Command.js";
import { buildErrorEmbed, buildSuccessEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";

function parseDeploymentTimeString(input: string) {
    const milis = ms(input);
    if (milis == undefined) {
        return new Error(`Invalid input: ${input}; reason: Failed to parse duration`);
    }
    const duration = Duration.fromMillis(milis);
    if (!duration.isValid) {
        return new Error(`Invalid input: ${input}; reason: ${duration.invalidReason}`)
    }
    const minDuration = Duration.fromDurationLike({ 'seconds': 10 });
    if (duration < minDuration) {
        return new Error(`Invalid input: ${input}; reason: duration must be >= ${minDuration.toHuman()}`)
    }
    return duration;
}

const data = new SlashCommandBuilder()
    .setName('set-deployment-time')
    .setDescription('Replies with Pong!')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(new SlashCommandStringOption()
        .setName('time')
        .setDescription('The time of the deployment')
        .setRequired(true)
    )
    .toJSON();

class SetDeploymentTimeCommandImpl implements CommandV2 {
    readonly name = data.name;
    async callback(interaction: ChatInputCommandInteraction) {
        const deploymentInterval = parseDeploymentTimeString(interaction.options.getString("time"));

        if (deploymentInterval instanceof Error) {
            const errorEmbed = buildErrorEmbed()
                .setTitle("Invalid time")
                .setDescription(deploymentInterval.message);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await HotDropQueue.getHotDropQueue().setDeploymentTime(deploymentInterval);

        const successEmbed = buildSuccessEmbed()
            .setTitle("Deployment time set")
            .setDescription(`The deployment time has been set to ${deploymentInterval.toHuman()}`);

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
    getData(): RESTPostAPIChatInputApplicationCommandsJSONBody {
        return data;
    }
}

export const SetDeploymentTimeCommand = new SetDeploymentTimeCommandImpl();

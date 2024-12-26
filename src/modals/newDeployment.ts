import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    GuildTextBasedChannel,
    ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from "discord.js";
import Modal from "../classes/Modal.js";
import LatestInput from "../tables/LatestInput.js";
import { buildButton, buildErrorEmbed, buildSuccessEmbed } from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import getStartTime from "../utils/getStartTime.js";
import {action, debug, error, log, success} from "../utils/logger.js";
import * as emoji from 'node-emoji';

async function storeLatestInput(interaction, { title, difficulty, description }) {
    const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });

    if (latestInput) {
        latestInput.title = title;
        latestInput.difficulty = difficulty;
        latestInput.description = description;
        await latestInput.save();
    } else {
        await LatestInput.insert({
            userId: interaction.user.id,
            title: title,
            difficulty: difficulty,
            description: description
        });
    }
}

async function reportFailedInteractionToUser(interaction: ModalSubmitInteraction, e: Error) {
    const errorEmbed = buildErrorEmbed()
        .setDescription(`The following error occurred while processing your request: ${e.toString()}`);
    
    await interaction.followUp({
        embeds: [errorEmbed],
        ephemeral: true
    });
}

export default new Modal({
    id: "newDeployment",
    callback: async function ({ interaction }) {
        action(`User ${interaction.user.tag} creating new deployment`, "NewDeployment");
        
        let title = interaction.fields.getTextInputValue("title");
        debug(`Title: ${title}`, "NewDeployment");
        
        let difficulty = interaction.fields.getTextInputValue("difficulty");
        let description = interaction.fields.getTextInputValue("description");
        const startTime = interaction.fields.getTextInputValue("startTime");

        try {
            title = emoji.strip(title).trim();
            difficulty = emoji.strip(difficulty).trim();
            description = emoji.strip(description).trim();

            if(!(title && difficulty && description)) throw new Error();
        } catch (e) {
            const errorEmbed = buildErrorEmbed()
                .setTitle("Parsing Error!")
                .setDescription("Please do not use emojis in any deployment fields!\n");
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        let startDate:Date = null;

        try { startDate = await getStartTime(startTime, interaction); }
        catch (e) {
            await storeLatestInput(interaction, { title, difficulty, description });
            log(`Invalid Start time!`, "NewDeployment");
            return;
        }

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setPlaceholder("Select a channel").setCustomId("channel").addOptions(
                config.channels.map(channel => ({
                    label: channel.name,
                    value: `${channel.channel}-${Math.random() * 1000}`,
                    emoji: channel.emoji
                })
            ))
        );

        try {
            await interaction.deferReply({ ephemeral: true });
            
            await interaction.editReply({
                content: `Helldivers, it's time to pick your battlefield. Select your region below to ensure you're dropped into the right chaos with the least lag (because lag's the real enemy here). Select the appropriate region to join your battalion's ranks!\n\n<@${interaction.user.id}>`,
                components: [row]
            });

            const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });
            if (latestInput) await latestInput.remove();

            const selectMenuResponse: StringSelectMenuInteraction = await interaction.channel.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id && i.customId === "channel",
                time: 60000
            }).catch(() => null);

            if (!selectMenuResponse) {
                const errorEmbed = buildErrorEmbed()
                    .setDescription("Channel selection timed out");

                await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

                return;
            }

            const successEmbed = buildSuccessEmbed()
                .setDescription("Deployment created successfully");

            await selectMenuResponse.update({ embeds: [successEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

            const channel = config.channels.find(channel => channel.channel === selectMenuResponse.values[0].split("-")[0]);

            const offenseRole = config.roles.find(role => role.name === "Offense");

            const googleCalendarLink = getGoogleCalendarLink(title, description, startDate.getTime(), (startDate.getTime() + 7200000))

            const embed = new EmbedBuilder()
                .setTitle(title)
                .addFields([
                    {
                        name: "Deployment Details:",
                        value: `📅 <t:${Math.round(startDate.getTime() / 1000)}:d> - [Calendar](${googleCalendarLink})\n🕒 <t:${Math.round(startDate.getTime() / 1000)}:t> - <t:${Math.round((startDate.getTime() + 7200000) / 1000)}:t>\n🪖 ${difficulty}`
                    },
                    {
                        name: "Description:",
                        value: description
                    },
                    {   
                        name: "Signups:",
                        value: `${offenseRole.emoji} ${interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.member.user.username}`,
                        inline: true
                    },
                    {
                        name: "Backups:",
                        value: "` - `",
                        inline: true
                    }
                ])
                .setColor("Green")
                .setFooter({ text: `Sign ups: 1/4 ~ Backups: 0/4` })
                .setTimestamp(startDate.getTime());

            const ch = await interaction.client.channels.fetch(channel.channel).catch(() => null) as GuildTextBasedChannel;

            const rows = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder().setPlaceholder("Select a role to sign up...").setCustomId("signup").addOptions(
                        ...config.roles.map(role => ({
                            label: role.name,
                            value: role.name,
                            emoji: role.emoji || undefined
                        })),
                        {
                            label: "Backup",
                            value: "backup",
                            emoji: config.backupEmoji
                        }
                )),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buildButton("editDeployment"),
                    buildButton("deleteDeployment"),
                    new ButtonBuilder()
                        .setCustomId("leaveDeployment")
                        .setLabel("Leave")
                        .setStyle(ButtonStyle.Danger)
                )
            ];

            const msg = await ch.send({ content: `<@${interaction.user.id}> is looking for people to group up! ⬇️`, embeds: [embed], components: rows });

            let deployment: Deployment = null;
            try {
                deployment = await Deployment.create({
                    channel: channel.channel,
                    message: msg.id,
                    user: interaction.user.id,
                    title: title,
                    difficulty: difficulty,
                    description: description,
                    startTime: startDate.getTime(),
                    endTime: startDate.getTime() + 7200000,
                    started: false,
                    deleted: false,
                    edited: false,
                    noticeSent: false
                }).save();

                await Signups.insert({
                    deploymentId: deployment.id,
                    userId: interaction.user.id,
                    role: "Offense"
                });
            } catch(e) {
                debug('Failed to save deployment to database');
                debug('Deleting deployment sign up message');
                await msg.delete().catch(e => { error(`Failed to delete ${title} signup embed`); console.log(e); });
                debug('Deleting success message');
                await interaction.deleteReply().catch(() => null);
                if (deployment != null) {
                    debug('Deleting saved deployment from database');
                    await Deployment.remove(deployment).catch(e => { error(`Failed to delete ${deployment.title} from db`); console.log(e); });
                }
                throw e;
            }

            await interaction.editReply({
                // your response content
            });

            success(`New deployment "${title}" created by ${interaction.user.tag}`, "NewDeployment");
        } catch (e) {
            error(`Failed to handle interaction in channel: ${interaction.channel.name} for user: ${interaction.user.tag} (${interaction.user.id})`); console.log(e);
            await reportFailedInteractionToUser(interaction, e).catch(e => { error(`Failed to respond to user with error for deployment ${title}`); console.log(e); });
        }
    }
})

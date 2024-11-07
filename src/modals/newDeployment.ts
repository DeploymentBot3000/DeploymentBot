import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildTextBasedChannel, StringSelectMenuBuilder, StringSelectMenuInteraction, GuildMember, ColorResolvable, ChannelType } from "discord.js";
import Modal from "../classes/Modal.js";
import LatestInput from "../tables/LatestInput.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import getStartTime from "../utils/getStartTime.js";
import { log, action, success, error, debug } from "../utils/logger.js";
import { validateAndRemoveEmojis } from "../utils/emojiHandler.js";

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

export default new Modal({
    id: "newDeployment",
    func: async function({ interaction }) {
        action(`User ${interaction.user.tag} creating new deployment`, "NewDeployment");
        
        const title = interaction.fields.getTextInputValue("title");
        debug(`Title: ${title}`, "NewDeployment");
        
        const difficulty = interaction.fields.getTextInputValue("difficulty");
        const description = interaction.fields.getTextInputValue("description");
        const startTime = interaction.fields.getTextInputValue("startTime");

        let cleanedFields;
        try {
            cleanedFields = validateAndRemoveEmojis({
                Title: title,
                Difficulty: difficulty,
                Description: description
            });
        } catch (e) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription(e.message);
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const cleanedTitle = cleanedFields.Title;
        const cleanedDifficulty = cleanedFields.Difficulty;
        const cleanedDescription = cleanedFields.Description;

        let startDate:Date = null;

        try { startDate = await getStartTime(startTime, interaction); }
        catch (e) {
            await storeLatestInput(interaction, { title, difficulty, description });
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
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Channel selection timed out");

                await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

                return;
            }

            const successEmbed = buildEmbed({ preset: "success" })
                .setDescription("Deployment created successfully");

            await selectMenuResponse.update({ embeds: [successEmbed], components: [] });
            setTimeout(() => interaction.deleteReply().catch(() => null), 45000);

            const channel = config.channels.find(channel => channel.channel === selectMenuResponse.values[0].split("-")[0]);

            const offenseRole = config.roles.find(role => role.name === "Offense");

            const googleCalendarLink = getGoogleCalendarLink(cleanedTitle, cleanedDescription, startDate.getTime(), (startDate.getTime() + 7200000))

            const embed = new EmbedBuilder()
                .setTitle(cleanedTitle)
                .addFields([
                    {
                        name: "Event Info:",
                        value: `📅 <t:${Math.round(startDate.getTime() / 1000)}:d> - [Calendar](${googleCalendarLink})\n🕒 <t:${Math.round(startDate.getTime() / 1000)}:t> - <t:${Math.round((startDate.getTime() + 7200000) / 1000)}:t>\n🪖 ${cleanedDifficulty}`
                    },
                    {
                        name: "Description:",
                        value: cleanedDescription
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

            const msg = await ch.send({ content: `<@&1302268594817597541> <@${interaction.user.id}> is looking for people to group up! ⬇️`, embeds: [embed], components: rows });

            const deployment = await Deployment.create({
                channel: channel.channel,
                message: msg.id,
                user: interaction.user.id,
                title: cleanedTitle,
                difficulty: cleanedDifficulty,
                description: cleanedDescription,
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

            await interaction.editReply({
                // your response content
            });

            success(`New deployment "${cleanedTitle}" created by ${interaction.user.tag}`, "NewDeployment");
        } catch (error) {
            error(`Failed to handle interaction: ${error}`, "NewDeployment");
            // Optionally try to send a follow-up if the initial reply failed
            try {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("An error occurred while processing your request.");
                
                await interaction.followUp({
                    embeds: [errorEmbed],
                    ephemeral: true
                });
                setTimeout(() => interaction.deleteReply().catch(() => null), 45000);
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        }
    }
})
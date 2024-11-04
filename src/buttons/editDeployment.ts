import { ActionRowBuilder, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";

export default new Button({
    id: "editDeployment",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function({ interaction }) {
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (deployment.user !== interaction.user.id) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You do not have permission to edit this deployment");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if(deployment.noticeSent) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You can't edit a deployment after the notice has been sent!");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const selectmenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setCustomId("editDeployment").setPlaceholder("Select an option").setMaxValues(4).addOptions(
                { label: "Title", value: "title", emoji: config.editEmoji },
                { label: "Difficulty", value: "difficulty", emoji: config.editEmoji },
                { label: "Description", value: "description", emoji: config.editEmoji },
                { label: "Start Time", value: "startTime", emoji: config.editEmoji }
            )
        );

        await interaction.reply({ content: "Select an option to edit", components: [selectmenu], ephemeral: true });

        const selectmenuInteraction: StringSelectMenuInteraction = await interaction.channel.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id && i.customId === "editDeployment",
            time: 120000
        }).catch(() => null);

        if (!selectmenuInteraction) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Selection timed out");

            return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
        }

        const rows = [];

        if (!selectmenuInteraction.values || !Array.isArray(selectmenuInteraction.values)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Invalid selection");

            return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
        }

        for (const choice of selectmenuInteraction.values) {
            switch (choice) {
                case "title":
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("title").setLabel("Title").setPlaceholder("Deployment Title").setRequired(true).setStyle(TextInputStyle.Short).setValue(deployment.title)
                        )
                    );
                    break;
                case "difficulty":
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("difficulty").setLabel("Difficulty").setPlaceholder("Deployment Difficulty").setRequired(true).setStyle(TextInputStyle.Short).setValue(deployment.difficulty)
                        )
                    );
                    break;
                case "description":
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("description").setLabel("Description").setPlaceholder("Deployment Description").setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1024).setValue(deployment.description)
                        )
                    );
                    break;
                case "startTime":
                    const date = new Date(Number(deployment.startTime));

                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH UTC+2").setRequired(true).setStyle(TextInputStyle.Short).setValue(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()} UTC+0`)
                        )
                    );
                    break;
            }
        }

        const modal = new ModalBuilder().setTitle("Edit Deployment").setCustomId("editDeployment").addComponents(rows)

        await selectmenuInteraction.showModal(modal);

        const modalInteraction: ModalSubmitInteraction = await selectmenuInteraction.awaitModalSubmit({ time: 2147483647 }).catch(() => null);

        if (!modalInteraction) return;

        if (selectmenuInteraction.values.includes("title")) {
            deployment.title = modalInteraction.fields.getTextInputValue("title");
        }
        if (selectmenuInteraction.values.includes("difficulty")) {
            deployment.difficulty = modalInteraction.fields.getTextInputValue("difficulty");
        }
        if (selectmenuInteraction.values.includes("description")) {
            deployment.description = modalInteraction.fields.getTextInputValue("description");
        }
        if (selectmenuInteraction.values.includes("startTime")) {
            try {
                const startTime = modalInteraction.fields.getTextInputValue("startTime");

                // Validate input format
                const timeRegex = /^\d{4}-\d{1,2}-\d{1,2}\s\d{1,2}(?::\d{2})?\s?UTC[+-]\d{1,2}$/;
                if (!timeRegex.test(startTime)) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Invalid date format. Please use exactly: YYYY-MM-DD HH:MM UTC+0");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                // Format the time string
                const startTimeFormatted = startTime.replace(/UTC\+(\d{1,2}):?(\d{2})?/, (_, hourOffset, minuteOffset = "00") => {
                    if (parseInt(hourOffset) > 23) {
                        throw new Error("Invalid UTC offset: hours cannot exceed 23");
                    }
                    return `UTC+${hourOffset.padStart(2, "0")}${minuteOffset.padStart(2, "0")}`.replace(/:/g, "");
                });

                const startDate = new Date(startTimeFormatted);

                // Validate parsed date
                if (isNaN(startDate.getTime())) {
                    throw new Error("Failed to parse date - invalid date components");
                }

                // Validate date is within reasonable bounds
                const maxDate = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
                if (startDate > maxDate) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Start time cannot be more than 1 year in the future");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                const currentStartTime = new Date(deployment.startTime);
                if (!currentStartTime || isNaN(currentStartTime.getTime())) {
                    throw new Error("Invalid current deployment start time");
                }

                const oneHourBeforeCurrentStart = new Date(currentStartTime.getTime() - 3600000);
                const now = new Date();

                // Validate against current time
                if (startDate.getTime() < now.getTime()) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Start time cannot be in the past");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                // Validate against current deployment time
                if (startDate.getTime() < oneHourBeforeCurrentStart.getTime()) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Cannot edit start time to be more than 1 hour earlier than the current start time");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                // Calculate end time (2 hours after start)
                const endTime = startDate.getTime() + 7200000;

                // Final validation of calculated times
                if (!Number.isInteger(startDate.getTime()) || !Number.isInteger(endTime)) {
                    throw new Error("Invalid timestamp calculation");
                }

                deployment.startTime = startDate.getTime();
                deployment.endTime = endTime;

            } catch (error) {
                console.error('Error processing start time:', error);
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription(`Failed to process start time: ${error.message || 'Unknown error'}\nPlease use format: YYYY-MM-DD HH:MM UTC+0`);
                return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
            }
        }

        // Add try-catch for the save operation
        try {
            await deployment.save();
        } catch (error) {
            console.error('Error saving deployment:', error);
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Failed to save deployment changes. Please try again.");
            return await modalInteraction.reply({ embeds: [errorEmbed], components: [], ephemeral: true }).catch(() => null);
        }

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Deployment edited successfully");

        await modalInteraction.reply({ embeds: [successEmbed], components: [], ephemeral: true }).catch(() => null);

        const signups = await Signups.find({ where: { deploymentId: deployment.id } });
        const backups = await Backups.find({ where: { deploymentId: deployment.id } });

        const signupMembers = [];
        const backupMembers = [];

        for (const signup of signups) {
            try {
                const member = await interaction.guild.members.fetch(signup.userId);
                if (member) {
                    signupMembers.push(signup);
                }
            } catch (error) {
                console.error(`Failed to fetch member for signup ${signup.userId}:`, error);
                // Remove invalid signup from database
                await signup.remove().catch(console.error);
            }
        }

        for (const backup of backups) {
            try {
                const member = await interaction.guild.members.fetch(backup.userId);
                if (member) {
                    backupMembers.push(backup);
                }
            } catch (error) {
                console.error(`Failed to fetch member for backup ${backup.userId}:`, error);
                // Remove invalid backup from database
                await backup.remove().catch(console.error);
            }
        }

        const googleCalendarLink = getGoogleCalendarLink(deployment.title, deployment.description, deployment.startTime, deployment.endTime);

        const embed = new EmbedBuilder()
            .setTitle(deployment.title)
            .addFields([
                {
                    name: "Event Info:",
                    value: `📅 <t:${Math.round(deployment.startTime / 1000)}:d> - [Calendar](${googleCalendarLink})\n🕒 <t:${Math.round(deployment.startTime / 1000)}:t> - <t:${Math.round((deployment.endTime / 1000))}:t>\n🪖 ${deployment.difficulty}`
                },
                {
                    name: "Description:",
                    value: deployment.description
                },
                {
                    name: "Signups:",
                    value: signupMembers.map(signup => {
                        const role = config.roles.find(role => role.name === signup.role);
                        const member = interaction.guild.members.cache.get(signup.userId);
                        return `${role.emoji} ${member ? member.displayName : `Unknown Member (${signup.userId})`}`;
                    }).join("\n") || "` - `",
                    inline: true
                },
                {
                    name: "Backups:",
                    value: backupMembers.length ?
                        backupMembers.map(backup => {
                            const member = interaction.guild.members.cache.get(backup.userId);
                            return member ? member.displayName : `Unknown Member (${backup.userId})`;
                        }).join("\n")
                        : "` - `",
                    inline: true
                }
            ])
            .setColor("Green")
            .setFooter({ text: `Sign ups: ${signupMembers.length}/4 ~ Backups: ${backupMembers.length}/4` })
            .setTimestamp(Number(deployment.startTime));

        await interaction.message.edit({ embeds: [embed] }).catch(() => null);
    }
})
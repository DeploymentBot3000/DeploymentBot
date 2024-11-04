import { ActionRowBuilder, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import { DateTime } from "luxon";

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
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH UTC+2").setRequired(true).setStyle(TextInputStyle.Short).setValue(`${deployment.startTime}`)
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
                console.log('Received start time:', startTime); // Debug log

                // Regex for both absolute and relative time formats
                const absoluteTimeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{1,2}) UTC[+-]\d{1,2}(:30)?$/;
                const relativeTimeRegex = /^(?:(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?)+$/;

                let startDate: Date;

                if (absoluteTimeRegex.test(startTime)) {
                    console.log('Parsing absolute time format'); // Debug log
                    const startDateTime = DateTime.fromFormat(startTime, "yyyy-MM-dd HH:mm 'UTC'ZZ");
                    
                    if (!startDateTime.isValid) {
                        console.log('Luxon parsing failed:', startDateTime.invalidReason); // Debug log
                        throw new Error(`Invalid datetime: ${startDateTime.invalidReason}`);
                    }
                    
                    startDate = startDateTime.toJSDate();
                    console.log('Parsed date:', startDate); // Debug log
                } else if (relativeTimeRegex.test(startTime)) {
                    console.log('Parsing relative time format'); // Debug log
                    const matches = startTime.match(/(\d+)([dhms])/g);
                    let totalMs = 0;

                    matches.forEach(match => {
                        const value = parseInt(match.slice(0, -1));
                        const unit = match.slice(-1);
                        console.log('Processing unit:', { value, unit }); // Debug log

                        switch (unit) {
                            case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
                            case 'h': totalMs += value * 60 * 60 * 1000; break;
                            case 'm': totalMs += value * 60 * 1000; break;
                            case 's': totalMs += value * 1000; break;
                        }
                    });

                    startDate = new Date(Date.now() + totalMs);
                    console.log('Calculated relative date:', startDate); // Debug log
                } else {
                    console.log('Failed regex tests'); // Debug log
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Invalid time format. Please use either:\n" +
                            "• Absolute time: `YYYY-MM-DD HH:MM UTC+X` (Example: `2024-03-25 18:30 UTC+0`)\n" +
                            "• Relative time: `#d#h#m#s` (Example: `2h30m` for 2 hours and 30 minutes from now)");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                // Validate parsed date
                if (!startDate || isNaN(startDate.getTime())) {
                    console.log('Invalid date object:', startDate); // Debug log
                    throw new Error(`Failed to parse date - invalid components: ${startTime}`);
                }

                console.log('Current deployment startTime:', deployment.startTime); // Debug log
                const currentStartTime = new Date(Number(deployment.startTime));
                console.log('Parsed current start time:', currentStartTime); // Debug log

                if (!currentStartTime || isNaN(currentStartTime.getTime())) {
                    throw new Error(`Invalid current deployment start time: ${deployment.startTime}`);
                }

                const oneHourBeforeCurrentStart = new Date(currentStartTime.getTime() - 3600000);
                const now = new Date();

                // Add validation logging
                console.log('Validation times:', {
                    now: now.toISOString(),
                    startDate: startDate.toISOString(),
                    currentStartTime: currentStartTime.toISOString(),
                    oneHourBeforeCurrentStart: oneHourBeforeCurrentStart.toISOString()
                });

                if (startDate.getTime() < now.getTime()) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Start time cannot be in the past");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                if (startDate.getTime() < oneHourBeforeCurrentStart.getTime()) {
                    const errorEmbed = buildEmbed({ preset: "error" })
                        .setDescription("Cannot edit start time to be more than 1 hour earlier than the current start time");
                    return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
                }

                const endTime = startDate.getTime() + 7200000;

                deployment.startTime = startDate.getTime();
                deployment.endTime = endTime;

                console.log('Final times set:', {
                    startTime: deployment.startTime,
                    endTime: deployment.endTime
                });

            } catch (error) {
                console.error('Error processing start time:', {
                    error: error.message,
                    stack: error.stack,
                    input: modalInteraction.fields.getTextInputValue("startTime")
                });
                
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription(`Failed to process start time: ${error.message}\n\nValid formats:\n` +
                        "• `YYYY-MM-DD HH:MM UTC+X` (Example: `2024-03-25 18:30 UTC+0`)\n" +
                        "• `#d#h#m#s` (Example: `2h30m` for 2 hours and 30 minutes from now)");
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
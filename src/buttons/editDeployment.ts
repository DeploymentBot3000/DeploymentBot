import { ActionRowBuilder, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import Signups from "../tables/Signups.js";
import Backups from "../tables/Backups.js";
import getGoogleCalendarLink from "../utils/getGoogleCalendarLink.js";
import {buildDeploymentEmbed} from "../utils/signupEmbedBuilder.js";

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

        // Delete the select menu after it's been used
        await interaction.editReply({ components: [] });

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
            const startTime = modalInteraction.fields.getTextInputValue("startTime");
            const startTimeFormatted = startTime.replace(/UTC\+(\d{1,2}):?(\d{2})?/, (_, hourOffset, minuteOffset = "00") => {
                return `UTC+${hourOffset.padStart(2, "0")}${minuteOffset.padStart(2, "0")}`.replace(/:/g, "");
            });

            const startDate = new Date(startTimeFormatted);
            const oneHourFromNow = Date.now() + 3600000; // 1 hour in milliseconds

            if (startDate.getTime() < oneHourFromNow) {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("Start time must be at least 1 hour from now");

                return await modalInteraction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
            }

            deployment.startTime = startDate.getTime();
            deployment.endTime = startDate.getTime() + 7200000;
        }

        await deployment.save();

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Deployment edited successfully");

        await modalInteraction.reply({ embeds: [successEmbed], components: [], ephemeral: true }).catch(() => null);

        const embed = await buildDeploymentEmbed(deployment, interaction.guild, "Green", true);

        await interaction.message.edit({ embeds: [embed] }).catch(() => null);
    }
})
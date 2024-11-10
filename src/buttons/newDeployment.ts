import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "../classes/Button.js";
import LatestInput from "../tables/LatestInput.js";
import config from "../config.js";

export default new Button({
    id: "newDeployment",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function({ interaction }) {
        const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });

        const modal = new ModalBuilder().setTitle("New Deployment").setCustomId("newDeployment").addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId("title").setLabel("Title").setPlaceholder("Deployment Title").setRequired(true).setStyle(TextInputStyle.Short).setValue(latestInput?.title || "").setMaxLength(50)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId("difficulty").setLabel("Difficulty").setPlaceholder("Deployment Difficulty").setRequired(true).setStyle(TextInputStyle.Short).setValue(latestInput?.difficulty || "").setMaxLength(15)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId("description").setLabel("Description").setPlaceholder("Deployment Description").setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(latestInput?.description || "")
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH:MM UTC(+/-)X").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(30)
            )
        );

        await interaction.showModal(modal);
    }
})
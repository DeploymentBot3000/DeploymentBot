import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import Button from "./button.js";
import LatestInput from "../tables/LatestInput.js";
import config from "../config.js";
import { Duration } from "luxon";

/*

// Testing block to understand how discord interactions work.
// The initial interaction has to be replied to within 3 seconds or deferred.
// If deferred, the interaction reply can be updated within 15 minutes.

import { ButtonInteraction } from "discord.js";

async function mockInteraction(interaction: ButtonInteraction) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('deferReply');
    await interaction.deferReply({ ephemeral: true });
    // The reply now has 3 elipses to indicate that the bot is working on the reply.
    // ... Deployment Bot is thinking...

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('editReply 1');
    await interaction.editReply({ content: "Deferred reply content updated" });

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('editReply 2');
    await interaction.editReply({ content: "Deferred reply content updated again" });

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('followUp');
    const followUp = await interaction.followUp({ content: "Follow Up", ephemeral: true });

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('editReply 3');
    await interaction.editReply({ content: "Deferred reply content updated a third time, even after a follow up was sent" });

    // This will not work, discord does not allow editing ephemeral follow ups.
    // await new Promise(resolve => setTimeout(resolve, 3000));
    // console.log('edit followUp');
    // await followUp.edit({ content: "Follow Up updated" });

    // This will not work, discord does not allow deleting ephemeral follow ups.
    // await new Promise(resolve => setTimeout(resolve, 3000));
    // console.log('delete followUp');
    // await followUp.delete();

    // This will not work since the interaction already has a reply.
    // await new Promise(resolve => setTimeout(resolve, 3000));
    // console.log('reply 1');
    // const reply = await interaction.reply({ content: "Reply", ephemeral: true });
}

*/

export default new Button({
    id: "newDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {

        // return mockInteraction(interaction);

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
                new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH:MM UTC(+/-)X").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50)
            )
        );

        await interaction.showModal(modal);
    }
})
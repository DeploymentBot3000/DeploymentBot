import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import checkBlacklist from "../utils/checkBlacklist.js";
import { Collection } from "discord.js";

// Add cooldown collection outside the button
const cooldowns = new Collection<string, number>();
const COOLDOWN_DURATION = 5000; // 2 seconds in milliseconds

export default new Button({
    id: "join",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        // Add cooldown check
        const lastUse = cooldowns.get(interaction.user.id);
        if (lastUse && Date.now() - lastUse < COOLDOWN_DURATION) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Please wait before using buttons again");
            const reply = await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            
            // Delete the error message after 45 seconds
            setTimeout(async () => {
                try {
                    await reply.delete();
                } catch (error) {
                    // Ignore any errors if message is already deleted
                }
            }, 45000);
            
            return;
        }
        
        cooldowns.set(interaction.user.id, Date.now());
        if (await checkBlacklist(interaction.user.id, interaction.guild)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You are blacklisted from joining queues");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferUpdate();
        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (alreadyQueued) {
            await Queue.update(
                { user: interaction.user.id },
                { host: false }
            );
        } else {
            await Queue.create({ user: interaction.user.id, host: false }).save();
        }

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})
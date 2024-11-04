import Button from "../classes/Button.js";
import { client } from "../index.js";
import Queue from "../tables/Queue.js";
import { buildEmbed } from "../utils/configBuilders.js";
import config from "../config.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { GuildMember } from "discord.js";
import { Collection } from "discord.js";

// Add cooldown collection outside the button
const cooldowns = new Collection<string, number>();
const COOLDOWN_DURATION = 5000; // 5 seconds in milliseconds

export default new Button({
    id: "host",
    cooldown: 0,
    permissions: [],
    requiredRoles: [{ role: config.hostRole, required: true }],
    func: async function({ interaction }) {
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
        await interaction.deferUpdate();

        const alreadyQueued = await Queue.findOne({ where: { user: interaction.user.id } });

        if (!(interaction.member as GuildMember).roles.cache.has(config.hostRole)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You don't have permission to be a host");
            return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (alreadyQueued) {
            await Queue.update(
                { host: true },
                { where: { user: interaction.user.id } }
            );
        } else {
            await Queue.create({ user: interaction.user.id, host: true });
        }

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildTextBasedChannel, StringSelectMenuBuilder, StringSelectMenuInteraction, GuildMember, ColorResolvable } from "discord.js";
import Modal from "../classes/Modal.js";
import LatestInput from "../tables/LatestInput.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import date from "date-and-time";
import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";
import { DateTime } from "luxon";
import formatToGoogleCalendarDate from "../utils/formatToGoogleCalendarDate.js";

const activeDeploymentCreations = new Set<string>();
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const userTimeouts = new Map<string, NodeJS.Timeout>();

// Function to cleanup user creation state
function cleanupUserCreation(userId: string) {
    activeDeploymentCreations.delete(userId);
    const timeout = userTimeouts.get(userId);
    if (timeout) {
        clearTimeout(timeout);
        userTimeouts.delete(userId);
    }
}

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
            title,
            difficulty,
            description
        });
    }
}

export default new Modal({
    id: "newDeployment",
    func: async function({ interaction }) {
        // Check if user already has an active deployment creation
        if (activeDeploymentCreations.has(interaction.user.id)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You already have an active deployment creation in progress. Please complete or cancel that one first.");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            cleanupUserCreation(interaction.user.id);
            return;
        }

        // Add user to active creations
        activeDeploymentCreations.add(interaction.user.id);
        // Set timeout to automatically remove after 5 minutes
        const timeout = setTimeout(() => {
            cleanupUserCreation(interaction.user.id);
        }, TIMEOUT_DURATION);
        userTimeouts.set(interaction.user.id, timeout);

        const title = interaction.fields.getTextInputValue("title");
        const difficulty = interaction.fields.getTextInputValue("difficulty");
        const description = interaction.fields.getTextInputValue("description");
        const startTime = interaction.fields.getTextInputValue("startTime");

        // Regex for both absolute and relative time formats
        const absoluteTimeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{1,2}) UTC[+-]\d{1,2}(:30)?$/;
        const relativeTimeRegex = /^(?:(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?)+$/;

        let startDate: Date;

        if (absoluteTimeRegex.test(startTime)) {
            // Parse using Luxon for better handling of time zones
            const startDateTime = DateTime.fromFormat(startTime, "yyyy-MM-dd HH:mm 'UTC'ZZ");
            startDate = startDateTime.toJSDate();  // Converts Luxon DateTime to JavaScript Date
        } else if (relativeTimeRegex.test(startTime)) {
            // Parse relative time
            const matches = startTime.match(/(\d+)([dhms])/g);
            let totalMs = 0;

            matches.forEach(match => {
                const value = parseInt(match.slice(0, -1));
                const unit = match.slice(-1);

                switch (unit) {
                    case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
                    case 'h': totalMs += value * 60 * 60 * 1000; break;
                    case 'm': totalMs += value * 60 * 1000; break;
                    case 's': totalMs += value * 1000; break;
                }
            });

            // Calculate the relative start date based on current time
            startDate = new Date(Date.now() + totalMs);
        } else {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Invalid start time format. Please use `YYYY-MM-DD HH:MM UTC(+/-)X` (EX:`2024-11-02 06:23 UTC-7`");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            await storeLatestInput(interaction, { title, difficulty, description });
            cleanupUserCreation(interaction.user.id);
            return;
        }

        // Checks for failure to parse date / time and handles along with logs
        if(startDate instanceof Date && isNaN(startDate.getTime())) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Error parsing date string, please try again later.");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            await storeLatestInput(interaction, { title, difficulty, description });
            console.log(`Error: Could not parse data/time string - ${startDate}`);
            cleanupUserCreation(interaction.user.id);
            return;
        }

        const oneHourFromNow = Date.now() + (60 * 60 * 1000); // 1 hour in milliseconds
        
        if (startDate.getTime() < oneHourFromNow) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Start time must be at least 1 hour in the future");


            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });

            const latestInput = await LatestInput.findOne({ where: { userId: interaction.user.id } });

            if (latestInput) {
                latestInput.title = title;
                latestInput.difficulty = difficulty;
                latestInput.description = description;
                await latestInput.save();
            } else {
                await LatestInput.insert({
                    userId: interaction.user.id,
                    title,
                    difficulty,
                    description
                });
            }

            cleanupUserCreation(interaction.user.id);
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
            
            await interaction.editReply({ components: [row] });

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
                // Remove user from active creations
                cleanupUserCreation(interaction.user.id);
                return;
            }

            const successEmbed = buildEmbed({ preset: "success" })
                .setDescription("Deployment created successfully");

            await selectMenuResponse.update({ embeds: [successEmbed], components: [] });

            const channel = config.channels.find(channel => channel.channel === selectMenuResponse.values[0].split("-")[0]);

            const offenseRole = config.roles.find(role => role.name === "Offense");

            const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatToGoogleCalendarDate(startDate.getTime())}/${formatToGoogleCalendarDate(startDate.getTime() + 7200000)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent("101st Deployments Channel")}&sf=true&output=xml`;

            const embed = new EmbedBuilder()
                .setTitle(title)
                .addFields([
                    {
                        name: "Event Info:",
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

            const msg = await ch.send({ content: `<@&1302268594817597541> <@${interaction.user.id}> is looking for people to group up! ⬇️`, embeds: [embed], components: rows });

            const deployment = await Deployment.create({
                channel: channel.channel,
                message: msg.id,
                user: interaction.user.id,
                title,
                difficulty,
                description,
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
        } catch (error) {
            console.error('Failed to handle interaction:', error);
            // Optionally try to send a follow-up if the initial reply failed
            try {
                const errorEmbed = buildEmbed({ preset: "error" })
                    .setDescription("An error occurred while processing your request.");
                
                await interaction.followUp({
                    embeds: [errorEmbed],
                    ephemeral: true
                });
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        } finally {
            // Always remove user from active creations when done
            cleanupUserCreation(interaction.user.id);
        }
    }
})

// Clear all active creations on module load (bot restart)
activeDeploymentCreations.clear();
userTimeouts.forEach(timeout => clearTimeout(timeout));
userTimeouts.clear();
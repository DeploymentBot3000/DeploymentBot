import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildTextBasedChannel, StringSelectMenuBuilder, StringSelectMenuInteraction } from "discord.js";
import Modal from "../classes/Modal.js";
import LatestInput from "../tables/LatestInput.js";
import { buildButton, buildEmbed } from "../utils/configBuilders.js";
import date from "date-and-time";
import config from "../config.js";
import Deployment from "../tables/Deployment.js";
import Signups from "../tables/Signups.js";

export default new Modal({
    id: "newDeployment",
    func: async function({ interaction }) {
        const title = interaction.fields.getTextInputValue("title");
        const difficulty = interaction.fields.getTextInputValue("difficulty");
        const description = interaction.fields.getTextInputValue("description");
        const startTime = interaction.fields.getTextInputValue("startTime");

        // Regex for both absolute and relative time formats
        const absoluteTimeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{1,2}) UTC[+-]\d{1,2}(:30)?$/;
        const relativeTimeRegex = /^(?:(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?)+$/;
        
        let startDate: Date;

        if (absoluteTimeRegex.test(startTime)) {
            // Extract timezone offset
            const match = startTime.match(/UTC([+-])(\d{1,2})(?::?(\d{2})?)/);
            const sign = match[1] === '+' ? 1 : -1; // Fix: Changed sign logic
            const hours = parseInt(match[2]);
            const minutes = match[3] ? parseInt(match[3]) : 0;
            const offsetMinutes = sign * (hours * 60 + minutes);

            // Parse the date without timezone
            let datePart = startTime.split(' UTC')[0];
            // Handle 24:00 by converting it to 00:00 of the next day
            if (datePart.includes('24:')) {
                const [date, time] = datePart.split(' ');
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                const formattedDate = nextDay.toISOString().split('T')[0];
                datePart = `${formattedDate} 00:${time.split(':')[1]}`;
            }
            
            const localDate = date.parse(datePart, 'YYYY-MM-DD HH:mm');
            if (isNaN(localDate.getTime())) {
                throw new Error('Invalid time format');
            }
            
            // Adjust for UTC offset
            startDate = new Date(localDate.getTime() + offsetMinutes * 60000);
        } else if (relativeTimeRegex.test(startTime)) {
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
            
            startDate = new Date(Date.now() + totalMs);
        } else {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Invalid start time format. Please use `YYYY-MM-DD HH:MM UTC(+/-)X` (EX:`2024-11-02 06:23 UTC-7`");

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

        await interaction.reply({ components: [row], ephemeral: true });

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

            return;
        }

        const successEmbed = buildEmbed({ preset: "success" })
            .setDescription("Deployment created successfully");

        await selectMenuResponse.update({ embeds: [successEmbed], components: [] });

        const channel = config.channels.find(channel => channel.channel === selectMenuResponse.values[0].split("-")[0]);

        const offenseRole = config.roles.find(role => role.name === "Offense");

        const embed = new EmbedBuilder()
            .setTitle(title)
            .addFields([
                {
                    name: "Event Info:",
                    value: `📅 <t:${Math.round(startDate.getTime() / 1000)}:d>\n🕒 <t:${Math.round(startDate.getTime() / 1000)}:t> - <t:${Math.round((startDate.getTime() + 7200000) / 1000)}:t>`
                },
                {
                    name: "Description:",
                    value: description
                },
                {
                    name: "Signups:",
                    value: `${offenseRole.emoji} <@${interaction.user.id}>`,
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
    }
})
import config from "../../config.js";
import colors from "colors";
import path from "path";
import {fileURLToPath} from 'url';
import { action, debug, error, log, success } from "../../utils/logger.js";
import { client, getDeploymentInterval } from "../../index.js";
import { readdirSync } from "fs";
import {REST} from '@discordjs/rest';
import { Routes, Snowflake } from 'discord-api-types/v10';
import { EmbedBuilder, GuildTextBasedChannel, ChannelType } from 'discord.js';
import Deployment from "../../tables/Deployment.js";
import Signups from "../../tables/Signups.js";
import Backups from "../../tables/Backups.js";
import { registerStartQueuedGameInterval, startQueuedGame } from "../../utils/startQueuedGame.js";
import {In, LessThanOrEqual} from 'typeorm';
import { DateTime, Duration } from 'luxon';
import cron from 'node-cron';
import {buildDeploymentEmbed} from "../../utils/embedBuilders/signupEmbedBuilder.js"
import LatestInput from "../../tables/LatestInput.js";
import { findAllVcCategories } from "../../utils/findChannels.js";
import discord_server_config from "../../config/discord_server.js";

interface Command {
	name: string;
	description: string;
	type?: number;
	options: any[]; // You can replace "any" with the correct type for options
}

// Map from vc channel id to the last time it was seen empty.
const lastSeenEmptyVcTime: Map<Snowflake, DateTime> = new Map();

async function importSlashCommands() {
	const commandsDirectoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../slashCommands');
	const commands: Command[] = [];
	for await (const file of readdirSync(commandsDirectoryPath)) {
		const filePath = path.join(commandsDirectoryPath, file);
		const command = (await import(path.join(commandsDirectoryPath, file))).default;
		if (!command.name) {
			throw new Error(`Failed to import command from file path: ${filePath}; No name property found`);
		}
		commands.push({
			name: command.name,
			type: command.type,
			description: command.description || null,
			options: command.options || null
		});
	}
	return commands;
}

export default {
	name: "ready",
	once: false,
	function: async function () {
		try {
			log(`Logged in as ${colors.red(client.user!.tag)}`, 'Startup');

			const commands = await importSlashCommands();
			log(`Imported ${commands.length} slash commands: ${commands.map(cmd => cmd.name).join(', ')}`, 'Startup');

			const rest = new REST().setToken(config.token);

			if (config.registerCommands) {
				log(`Registering shash commands: ${commands.map(cmd => cmd.name).join(', ')} for guild: ${config.guildId}`, 'Startup');
				await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), { body: commands });
				success(`Successfully registered ${commands.length} shash commands for guild: ${config.guildId}`, 'Startup');
			}

			const checkDeployments = async () => {
				const now = DateTime.now();
				const deploymentsNoNotice = await Deployment.find({
					where: {
						deleted: false,
						noticeSent: false,
						startTime: LessThanOrEqual(now.plus({'minutes': config.departure_notice_lead_time_minutes}).toMillis())
					}
				})
				const unstartedDeployments = await Deployment.find({
					where: {
						deleted: false,
						started: false,
						startTime: LessThanOrEqual(now.toMillis()),
					}
				});

				for (const deployment of deploymentsNoNotice) {
					const departureChannel = await client.channels.fetch(config.departureChannel).catch(() => null) as GuildTextBasedChannel;
					const signups = await Signups.find({ where: { deploymentId: deployment.id } });
					const backups = await Backups.find({ where: { deploymentId: deployment.id } });

					const signupsFormatted = signups.map(signup => {
						if (signup.userId == deployment.user) return;
						const role = config.roles.find(role => role.name === signup.role);
						return `${role.emoji} <@${signup.userId}>`;
					}).filter(s => s).join("\n") || "` - `";

					const backupsFormatted = backups.map(backup => `${config.backupEmoji} <@${backup.userId}>`).join("\n");

					const operationRegex = /^(op(p)?eration|operration|opperation|operacion):?\s*/i;
					const formattedTitle = operationRegex.test(deployment.title)
						? deployment.title
						: `Operation: ${deployment.title}`;

					await departureChannel.send({
						content: `-------------------------------------------\n\n# ATTENTION HELLDIVERS \n\n\n**${formattedTitle}**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**. <@${deployment.user}> will open communication channels in the next **5 minutes** and Divers are expected to be present.\n\n**Difficulty:** **${deployment.difficulty}**\n\n**Deployment Lead:**\n<@${deployment.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\n${backupsFormatted.length ? `**Standby divers:**\n${backupsFormatted}\n\n` : ""}You are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------` });

					deployment.noticeSent = true;

					await deployment.save();

				}

				for (const deployment of unstartedDeployments) {
					const channel = await client.channels.fetch(deployment.channel).catch(() => null) as GuildTextBasedChannel;
					const message = await channel.messages.fetch(deployment.message).catch(() => null);

					if (!message) continue;

					try {
						const embed = await buildDeploymentEmbed(deployment, message.guild, "Red", true);
						await message.edit({ content: "", embeds: [embed], components: [] });

						// Fetch all logging channels and send to each
						
						const loggingChannel = await client.channels.fetch(config.log_channel_id).catch(() => null) as GuildTextBasedChannel;
						const signups = await Signups.find({ where: { deploymentId: deployment.id } });
						const backups = await Backups.find({ where: { deploymentId: deployment.id } });

						const signupsFormatted = signups.map(signup => {
							if (signup.userId == deployment.user) return;
							const role = config.roles.find(role => role.name === signup.role);
							const member = message.guild.members.cache.get(signup.userId);
							return `${role.emoji} ${member?.nickname || member?.user.username || signup.userId}`;
						}).filter(s => s).join("\n") || "- None -";

						const backupsFormatted = backups.map(backup => {
							const member = message.guild.members.cache.get(backup.userId);
							return `${config.backupEmoji} ${member?.nickname || member?.user.username || backup.userId}`;
						}).join("\n") || "- None -";

						const logEmbed = new EmbedBuilder()
							.setColor("Yellow")
							.setTitle("Deployment Started")
							.addFields(
								{ name: "Title", value: deployment.title, inline: true },
								{ name: "Host", value: message.guild.members.cache.get(deployment.user)?.nickname || deployment.user, inline: true },
								{ name: "Difficulty", value: deployment.difficulty, inline: true },
								{ name: "Time", value: `<t:${Math.floor(deployment.startTime / 1000)}:F>`, inline: false },
								{ name: "Players", value: signupsFormatted, inline: true },
								{ name: "Backups", value: backupsFormatted, inline: true },
								{ name: "Description", value: deployment.description || "No description provided" }
							)
							.setTimestamp();

						await loggingChannel.send({ embeds: [logEmbed] });
					} catch (err) {
						console.error(`Error building deployment embed for deployment ${deployment.id}:`, err);
					}

					deployment.started = true;
					await deployment.save();
				}

				const deploymentDeleteLeadTime = Duration.fromDurationLike({'minutes': config.deployment_delete_time_minutes});
				const deploymentsToDelete = await Deployment.find({
					where: {
						deleted: false,
						endTime: LessThanOrEqual((now.minus(deploymentDeleteLeadTime)).toMillis())
					}
				});

				for (const deployment of deploymentsToDelete) {
					const channel = await client.channels.fetch(deployment.channel).catch(() => null) as GuildTextBasedChannel;
					const message = await channel.messages.fetch(deployment.message).catch(() => null);

					if (message) {
						await message.delete().catch(() => null);
					}
					deployment.deleted = true;
					await deployment.save();
				}
			};


			await checkDeployments();
			cron.schedule('* * * * *', checkDeployments);

			const deploymentInterval = await getDeploymentInterval();
			await startQueuedGame(deploymentInterval);
			registerStartQueuedGameInterval(deploymentInterval);

			if (!client.nextGame) {
				client.nextGame = new Date(Date.now() + deploymentInterval.toMillis());
			}

			// Scan every X minutes and delete channels that have also been empty on the previous scan.
			const clearVcChannelsInterval = Duration.fromDurationLike({ 'minutes': discord_server_config.clear_vc_channels_every_minutes });
			const deleteChannelAfterVacantFor = clearVcChannelsInterval.minus({ 'seconds': 30 });
			function clearEmptyVoiceChannels() {
				debug("Clearing empty voice channels");
				const guild = client.guilds.cache.get(config.guildId);
				for (const prefix of [discord_server_config.strike_vc_category_prefix, discord_server_config.hotdrop_vc_category_prefix]) {
					for (const vcCategory of findAllVcCategories(guild, prefix).values()) {
						for (const channel of vcCategory.children.cache.values()) {
							if (channel.type == ChannelType.GuildVoice && channel.members.size == 0) {
								const lastSeenEmpty = lastSeenEmptyVcTime.get(channel.id) || DateTime.now();
								lastSeenEmptyVcTime.set(channel.id, lastSeenEmpty);
								if (lastSeenEmpty.plus(deleteChannelAfterVacantFor) < DateTime.now()) {
									debug(`Deleting voice channel: ${channel.name} with id: ${channel.id}`);
									channel.delete().catch((err) => console.log(err));
									lastSeenEmptyVcTime.delete(channel.id);
								} else {
									debug(`Voice channel: ${channel.name} with id: ${channel.id} was last seen empty on ${lastSeenEmpty.toISO()}, not old enough to delete`);
								}
							}

						}
					}
				}
			};
			// Clear voice channels once once on startup
			clearEmptyVoiceChannels();
			// Clear empty voice channels every 10 minutes.
			setInterval(clearEmptyVoiceChannels, clearVcChannelsInterval.toMillis());

			// Remove deployment signup every hour on the hour.
			cron.schedule("0 * * * *", async () => {
				const deletedDeployments:Deployment[] = await Deployment.find({ where: { deleted: true }});
				for(const deployment of deletedDeployments) {
					await Signups.delete({ deploymentId: deployment.id });
					await Backups.delete({ deploymentId: deployment.id });
					await Deployment.delete({ id: deployment.id });
					console.log(`Deleted deployment: ${deployment.id} & associated signups & backups`);
				}
			})

			cron.schedule("0 0 * * *", async () => {
				const deployments = await Deployment.find();
				const signups = await Signups.find();
				const backups = await Backups.find();
				const deploymentsIDs = deployments.map(deployment => deployment.id);
				const signupsToDelete = signups.filter(s => !deploymentsIDs.includes(s.deploymentId)).map(s => s.id);
				const backupsToDelete = backups.filter(b => !deploymentsIDs.includes(b.deploymentId)).map(b => b.id);
				await Signups.delete({ id: In(signupsToDelete) });
				await Backups.delete({ id: In(backupsToDelete) });
				await LatestInput.clear();

				console.log("Database Purge:")
				console.log(`Cleared ${signupsToDelete.length} invalid signups!`);
				console.log(`Cleared ${backupsToDelete.length} invalid backups!`);
				console.log(`Cleared last input data!`);
			})

			success(`Bot startup complete`, "Startup");
		} catch (e) {
			error(`Startup failed`, "Startup");
			error(e);
			client.destroy().then(r => null);
			process.exit(1);
		}
	},
} as any;

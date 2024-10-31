import config from "../../config.js";
import colors from "colors";
import path from "path";
import { fileURLToPath } from 'url';
import { log, error } from "../../utils/logger.js";
import { client, getDeploymentTime } from "../../index.js";
import { readdirSync, statSync } from "fs";
import { REST } from "@discordjs/rest";
import { ChannelType, Routes } from "discord-api-types/v10";
import { convertURLs } from "../../utils/windowsUrlConvertor.js";
import Deployment from "../../tables/Deployment.js";
import { ActionRowBuilder, ButtonBuilder, GuildTextBasedChannel, StringSelectMenuBuilder, User } from "discord.js";
import Signups from "../../tables/Signups.js";
import Backups from "../../tables/Backups.js";
import { buildButton, buildEmbed } from "../../utils/configBuilders.js";
import VoiceChannel from "../../tables/VoiceChannel.js";
import { startQueuedGame } from "../../utils/startQueuedGame.js";
import {LessThanOrEqual, MoreThanOrEqual} from 'typeorm';
import {DateTime} from 'luxon';

interface Command {
	name: string;
	description: string;
	type?: number;
	options: any[]; // You can replace "any" with the correct type for options
}

export default {
	name: "ready",
	once: false,
	function: async function () {
		log(`Logged in as ${colors.red(client.user!.tag)}`);

		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);

		const commands: Command[] = [];

		const registerDir = async (dirName: string) => {
			const COMMAND_DIR = path.resolve(__dirname, `../../${dirName}`);
			const readDir = async (dir: string) => {
				const files = readdirSync(dir);
				for await (const file of files) {
					if (statSync(`${dir}/${file}`).isDirectory()) await readDir(`${dir}/${file}`);
					else {
						const fileToImport = process.platform === "win32" ? `${convertURLs(dir)}/${file}` : `${dir}/${file}`;
						const command = (await import(fileToImport)).default;
						if (command?.name) {
							commands.push({
								name: command.name,
								type: command.type,
								description: command.description || null,
								options: command.options || null
							});
							log(`${dir}/${file} has been registered!`);
						} else {
							error(`${dir}/${file} has no name!`);
						}
					}
				}
			};
			await readDir(COMMAND_DIR);
		};

		await registerDir("slashCommands");
		await registerDir("contextMenus");

		const rest = new REST({ version: '10' }).setToken(config.token);
		rest
			.put(Routes.applicationCommands(client.user!.id), { body: commands })
			.then(() => log('Commands have been registered successfully!'))
			.catch((err) => console.log(err));

		const checkDeployments = async () => {
			const deploymentsNoNotice = await Deployment.find({
				where: {
					noticeSent: false
				}
			})
			const unstartedDeployments = await Deployment.find({
				where: {
					started: false,
					startTime: LessThanOrEqual(DateTime.now().toMillis()),
				}
			});

			for (const deployment of deploymentsNoNotice) {
				if (deployment.startTime - await getDeploymentTime() < Date.now()) {
					const departureChannel = await client.channels.fetch(config.departureChannel).catch(() => null) as GuildTextBasedChannel;
					const signups = await Signups.find({ where: { deploymentId: deployment.id } });
					const backups = await Backups.find({ where: { deploymentId: deployment.id } });

					const signupsFormatted = signups.map(signup => {
						if (signup.userId == deployment.user) return;
						const role = config.roles.find(role => role.name === signup.role);
						return `${role.emoji} <@${signup.userId}>`;
					}).filter(s => s).join("\n") || "` - `";

					const backupsFormatted = backups.map(backup => `<@${backup.userId}>`).join("\n");

					await departureChannel.send({
						content: `# ATTENTION HELLDIVERS\n\n\nOperation: **${deployment.title}**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in 15 minutes. <@${deployment.user}> will open communication channels in the next 5 minutes and Divers are expected to be present.\n\nDifficulty: **${deployment.difficulty}**\n\nDeployment Lead:\n<@${deployment.user}>\n\nHelldivers assigned:\n${signupsFormatted}\n\n${backupsFormatted.length ? `Standby divers:\n${backupsFormatted}\n\n` : ""}You are the selected Divers for this operation. Be ready 15 minutes before deployment time. If you are to be late make sure you inform the deployment host.` });

					deployment.noticeSent = true;

					await deployment.save();
				}
			}

			for (const deployment of unstartedDeployments) {
				const channel = await client.channels.fetch(deployment.channel).catch(() => null) as GuildTextBasedChannel;
				const message = await channel.messages.fetch(deployment.message).catch(() => null);

				if (!message) continue;

				const rows = [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						new StringSelectMenuBuilder().setPlaceholder("Deployment has started").setCustomId("signup").addOptions(
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
						).setDisabled(true)),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						buildButton("editDeployment").setDisabled(true),
						buildButton("deleteDeployment").setDisabled(true)
					)
				];

				const startedEmbed = buildEmbed({ 
					preset: "deploymentStarted", 
					placeholders: { 
						title: deployment.title,
						difficulty: deployment.difficulty,
						user: deployment.user,
						// Add other relevant properties from deployment as needed
					} 
				});

				await message.edit({ embeds: [startedEmbed], components: rows }).catch(() => null);

				deployment.started = true;
				await deployment.save();
			}

			const deploymentsToEdit = await Deployment.find({
				where: {
					started: true,
					edited: false,
					startTime: LessThanOrEqual(DateTime.now().toMillis())
				}
			});

			for (const deployment of deploymentsToEdit) {
				const channel = await client.channels.fetch(deployment.channel).catch(() => null) as GuildTextBasedChannel;
				const message = await channel.messages.fetch(deployment.message).catch(() => null);

				if (!message) continue;

				const editedEmbed = buildEmbed({
					preset: "deploymentInProgress",
					placeholders: {
						title: deployment.title,
						difficulty: deployment.difficulty,
						user: deployment.user,
						// Add other relevant properties from deployment as needed
					}
				});

				await message.edit({ embeds: [editedEmbed], components: [] }).catch(() => null);

				deployment.edited = true;
				await deployment.save();
			}

			const deploymentsToDelete = await Deployment.find({
				where: {
					edited: true,
					startTime: LessThanOrEqual(DateTime.now().plus({ hours: 2 }).toMillis())
				}
			});
			//
			// for (const deployment of deploymentsToDelete) {
			// 	const channel = await client.channels.fetch(deployment.channel).catch(() => null) as GuildTextBasedChannel;
			// 	const message = await channel.messages.fetch(deployment.message).catch(() => null);
			//
			// 	if (message) {
			// 		await message.delete().catch(() => null);
			// 	}
			// 	deployment.deleted = true;
			// 	await deployment.save();
			// }
			console.log(DateTime.now())
			console.log(unstartedDeployments)
			console.log(deploymentsToEdit)
			console.log(deploymentsToDelete)
		};


		await checkDeployments();
		setInterval(checkDeployments, 60000);

		const deploymentTime = await getDeploymentTime();
		await startQueuedGame(deploymentTime);

		const interval = setInterval(() => {
			startQueuedGame(deploymentTime);
		}, deploymentTime);
		client.interval = interval;

		if (!client.nextGame) {
			client.nextGame = new Date(Date.now() + deploymentTime);
		}

		const clearExpiredVCs = async () => {
			const vcs = await VoiceChannel.find();

			for (const vc of vcs) {
				if (vc.expires < Date.now()) {
					const channel = await client.channels.fetch(vc.channel).catch(() => null) as GuildTextBasedChannel;
					if (!channel) {
						await vc.remove();
						return;
					}

					if (channel.type !== ChannelType.GuildVoice) return;

					if (channel.members.size > 0) return;

					await channel.delete().catch(() => null);
					await vc.remove();
				}
			}
		};

		await clearExpiredVCs();
		setInterval(clearExpiredVCs, 60000);
	},
} as any;

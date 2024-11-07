import config from "../../config.js";
import colors from "colors";
import path from "path";
import { fileURLToPath } from 'url';
import { log, error, action, success, debug } from "../../utils/logger.js";
import { client, getDeploymentTime } from "../../index.js";
import { readdirSync, statSync } from "fs";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { convertURLs } from "../../utils/windowsUrlConvertor.js";
import Deployment from "../../tables/Deployment.js";
import {
	BaseGuildVoiceChannel,
	GuildTextBasedChannel,
} from "discord.js";
import Signups from "../../tables/Signups.js";
import Backups from "../../tables/Backups.js";
import VoiceChannel from "../../tables/VoiceChannel.js";
import { startQueuedGame } from "../../utils/startQueuedGame.js";
import {BaseEntity, In, LessThanOrEqual} from 'typeorm';
import {DateTime} from 'luxon';
import cron from 'node-cron';
import { buildDeploymentEmbed } from "../../utils/signupEmbedBuilder.js"
import { EmbedBuilder } from "discord.js";
import deployments from "../../slashCommands/deployments.js";
import LatestInput from "../../tables/LatestInput.js";

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
		action(`Bot starting up`, "Startup");

		try {
			log(`Logged in as ${colors.red(client.user!.tag)}`);

			const __filename:string = fileURLToPath(import.meta.url);
			const __dirname:string = path.dirname(__filename);

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
						deleted: false,
						noticeSent: false,
						startTime: LessThanOrEqual(DateTime.now().plus({minute: 15}).toMillis())
					}
				})
				const unstartedDeployments = await Deployment.find({
					where: {
						deleted: false,
						started: false,
						startTime: LessThanOrEqual(DateTime.now().toMillis()),
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

					const backupsFormatted = backups.map(backup => `<@${backup.userId}>`).join("\n");

					const operationRegex = /^(op(p)?eration|operration|opperation|operacion):?\s*/i;
					const formattedTitle = operationRegex.test(deployment.title)
						? deployment.title
						: `Operation: ${deployment.title}`;

					await departureChannel.send({
						content: `-------------------------------------------\n\n# <:Helldivers:1226464844534779984> ATTENTION HELLDIVERS <:Helldivers:1226464844534779984>\n\n\n**${formattedTitle}**\nA Super Earth Destroyer will be mission ready and deploying to the Operation grounds in **15 minutes**. <@${deployment.user}> will open communication channels in the next **5 minutes** and Divers are expected to be present.\n\n**Difficulty:** **${deployment.difficulty}**\n\n**Deployment Lead:**\n<@${deployment.user}>\n\n**Helldivers assigned:**\n${signupsFormatted}\n\n${backupsFormatted.length ? `**Standby divers:**\n${backupsFormatted}\n\n` : ""}You are the selected Divers for this operation. Be ready **15 minutes** before deployment time. If you are to be late make sure you inform the deployment host.\n-------------------------------------------` });

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
						for (const channelId of config.loggingChannels) {
							const loggingChannel = await client.channels.fetch(channelId).catch(() => null) as GuildTextBasedChannel;
							if (loggingChannel) {
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
									return member?.nickname || member?.user.username || backup.userId;
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
							}
						}
					} catch (err) {
						console.error(`Error building deployment embed for deployment ${deployment.id}:`, err);
					}

					deployment.started = true;
					await deployment.save();
				}

				const deploymentsToDelete = await Deployment.find({
					where: {
						deleted: false,
						endTime: LessThanOrEqual(DateTime.now().toMillis())
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


			cron.schedule('0 8,20 * * *', async () => {
				const channel = await client.channels.fetch('1218616472289673267').catch(() => null) as GuildTextBasedChannel;
				if (channel) {
					await channel.send("Good morning battalion!");
				}
			});

			const deploymentTime = await getDeploymentTime();
			await startQueuedGame(deploymentTime);

			const interval = setInterval(() => {
				startQueuedGame(deploymentTime);
			}, deploymentTime);
			client.interval = interval;

			if (!client.nextGame) {
				client.nextGame = new Date(Date.now() + deploymentTime);
			}

			// Dynamically delete pickdrop VCs as soon as everyone leaves
			client.on('voiceStateUpdate', async (oldState, newState) => {
				const channel = oldState.channel || newState.channel;
				if(!(channel.parent.id == config.vcCategory)) return;

				const vc = await VoiceChannel.findOne({
					where: {
						channel: channel.id,
						expires: LessThanOrEqual(DateTime.now().toMillis())
					}
				});

				if (!vc) return;

				if(channel && !channel.members.size) {
					await channel.delete().catch((err) => console.log(err));
					await vc.remove().catch((err) => console.log(err));
					console.log(`Expired & empty channel ${channel.id} deleted`);
				}
			});

			cron.schedule("* * * * *", async () => {
				const vcs = await VoiceChannel.find({ where: { expires: LessThanOrEqual(DateTime.now().toMillis()) } });

				for (const vc of vcs) {
					const channel = await client.channels.fetch(vc.channel).catch(() => null) as BaseGuildVoiceChannel;

					if (!channel) {
						await vc.remove();
						return;
					}

					if (channel.members.size > 0) return;

					await channel.delete().catch(() => null);
					await vc.remove();
				}
			});

			cron.schedule("0 * * * *", async () => {
				const deletedDeployments:Deployment[] = await Deployment.find({ where: { deleted: true }});
				for(const deployment of deletedDeployments) {
					await Signups.delete({ deploymentId: deployment.id });
					await Backups.delete({ deploymentId: deployment.id });
					await Deployment.delete({ id: deployment.id });
					console.log(`Deleted deployment: ${deployment.id} & associated signups & backups`);
				}
			})

			cron.schedule("52 7 * * *", async () => {
				const deployments = await Deployment.find();
				const signups = await Signups.find();
				const backups = await Backups.find();
				const deploymentsIDs = deployments.map(deployment => deployment.id);
				const signupsToDelete = signups.filter(s => !deploymentsIDs.includes(s.deploymentId)).map(s => s.id);
				const backupsToDelete = backups.filter(b => !deploymentsIDs.includes(b.deploymentId)).map(b => b.id);
				await Signups.delete({ id: In(signupsToDelete) });
				await Backups.delete({ id: In(backupsToDelete) });
				await LatestInput.clear();

				console.log(`Cleared invalid signups!`);
				console.log(`Cleared last input data!`);
			})

			success(`Bot startup complete`, "Startup");
		} catch (e) {
			error(`Startup failed: ${e}`, "Startup");
			throw e;
		}
	},
} as any;

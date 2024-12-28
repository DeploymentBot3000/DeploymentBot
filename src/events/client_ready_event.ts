import config from "../config.js";
import colors from "colors";
import { error, log, success } from "../utils/logger.js";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { Client, Colors } from 'discord.js';
import { sendEmbedToLogChannel } from "../utils/log_channel.js";
import { getAllSlashCommands } from "../utils/slash_commands_registery.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { setWakingUpActivity, startActivityInterval } from "../utils/bot_activity.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { VoiceChannelManager } from "../utils/voice_channels.js";
import { DeploymentManager } from "../utils/deployments.js";

export async function discordClientReadyCallback(client: Client) {
	try {
		log(`Logged in as ${colors.red(client.user!.tag)}`, 'Startup');

		setWakingUpActivity(client);

		const rest = new REST().setToken(config.token);

		if (config.registerCommands) {
			const commands = getAllSlashCommands();
			log(`Registering shash commands: ${commands.map(cmd => cmd.name).join(', ')} for guild: ${config.guildId}`, 'Startup');
			await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), { body: commands });
			success(`Successfully registered ${commands.length} shash commands for guild: ${config.guildId}`, 'Startup');
		}

		await HotDropQueue.initHotDropQueue(client);
		await DeploymentManager.init(client);
		await VoiceChannelManager.init(client);

		await sendEmbedToLogChannel(buildSuccessEmbed()
			.setColor(Colors.Green)
			.setTitle("Bot Startup Complete!"), client);
		startActivityInterval(client);
		success(`Bot startup complete`, "Startup");
	} catch (e) {
		error(`Startup failed`, "Startup");
		error(e);
		client.destroy();
		process.exit(1);
	}
}

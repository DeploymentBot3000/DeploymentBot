import { Client } from "discord.js";
import autocompleteInteraction from "../events/client/autocompleteInteraction.js";
import buttonInteraction from "../events/client/buttonInteraction.js";
import interactionCreate from "../events/client/interactionCreate.js";
import modalSubmittionInteraction from "../events/client/modalSubmittionInteraction.js";
import ready from "../events/client/ready.js";
import removeExpiredVoiceChannels from "../events/client/removeExpiredVoiceChannels.js";
import selectMenuInteraction from "../events/client/selectMenuInteraction.js";
import messageCreate from "../events/guild/messageCreate.js";

export function registerEventHandlers(client: Client) {
	// Client Events
	client.on(autocompleteInteraction.name, autocompleteInteraction.function.bind(null));
	client.on(buttonInteraction.name, buttonInteraction.function.bind(null));
	client.on(interactionCreate.name, interactionCreate.function.bind(null));
	client.on(modalSubmittionInteraction.name, modalSubmittionInteraction.function.bind(null));
	client.on(removeExpiredVoiceChannels.name, removeExpiredVoiceChannels.function.bind(null));
	client.on(selectMenuInteraction.name, selectMenuInteraction.function.bind(null));

	// Guild Events
	client.on(messageCreate.name, messageCreate.function.bind(null));

	// Client Ready Once Event
	client.once(ready.name, ready.function);
}

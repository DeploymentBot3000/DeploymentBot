import { Client } from "discord.js";
import autocompleteInteraction from "../events/auto_complete_Interaction.js";
import buttonInteraction from "../events/button_interaction.js";
import interactionCreate from "../events/chat_input_command_interaction.js";
import modalSubmittionInteraction from "../events/modal_submit_interaction.js";
import ready from "../events/client_ready_event.js";
import removeExpiredVoiceChannels from "../events/voice_state_update_event.js";
import selectMenuInteraction from "../events/select_menu_interaction.js";

export function registerEventHandlers(client: Client) {
	// Client Events
	client.on(autocompleteInteraction.name, autocompleteInteraction.function.bind(null));
	client.on(buttonInteraction.name, buttonInteraction.function.bind(null));
	client.on(interactionCreate.name, interactionCreate.function.bind(null));
	client.on(modalSubmittionInteraction.name, modalSubmittionInteraction.function.bind(null));
	client.on(removeExpiredVoiceChannels.name, removeExpiredVoiceChannels.function.bind(null));
	client.on(selectMenuInteraction.name, selectMenuInteraction.function.bind(null));

	// Client Ready Once Event
	client.once(ready.name, ready.function);
}

import { ButtonInteraction } from "discord.js";
import { Button } from "../buttons/button.js";
import { DeploymentDeleteButton } from "../interactions/deployment_delete.js";
import { DeploymentEditButton } from "../interactions/deployment_edit.js";
import { DeploymentLeaveButton } from "../interactions/deployment_leave.js";
import { DeploymentNewButton } from "../interactions/deployment_new.js";
import { QueueHostButton } from "../interactions/queue_host.js";
import { QueueJoinButton } from "../interactions/queue_join.js";
import { QueueLeaveButton } from "../interactions/queue_leave.js";
import { checkCooldown } from "../utils/cooldowns.js";
import { replyWithError } from "../utils/interaction_replies.js";
import { checkPermissions } from "../utils/permissions.js";

const _kButtons: Map<string, Button> = new Map();

_kButtons.set(DeploymentDeleteButton.id, DeploymentDeleteButton);
_kButtons.set(DeploymentEditButton.id, DeploymentEditButton);
_kButtons.set(QueueHostButton.id, QueueHostButton);
_kButtons.set(QueueJoinButton.id, QueueJoinButton);
_kButtons.set(QueueLeaveButton.id, QueueLeaveButton);
_kButtons.set(DeploymentLeaveButton.id, DeploymentLeaveButton);
_kButtons.set(DeploymentNewButton.id, DeploymentNewButton);

function getButtonById(id: string): Button | undefined {
	return _kButtons.get(id);
}

export default {
	callback: async function (interaction: ButtonInteraction<'cached'>) {
		const button = getButtonById(interaction.customId) || getButtonById(interaction.customId.split("-")[0]);
		if (!button) {
			throw new Error(`Button: ${interaction.customId} not found!`);
		}

		let e = await checkPermissions(interaction.member, button.permissions);
		if (e) {
			await replyWithError(interaction, e.message);
			return;
		}

		e = checkCooldown(interaction.user.id, button.id, button.cooldown);
		if (e) {
			await replyWithError(interaction, e.message);
			return;
		}
		await button.callback({ interaction });
	},
}

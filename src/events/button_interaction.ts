import colors from "colors";
import { ButtonInteraction } from "discord.js";
import { log } from "../utils/logger.js";
import { checkBlacklist, hasRequiredPermissions, hasRequiredRoles } from "../utils/permissions.js";

import Button from "../buttons/button.js";
import deleteDeployment from "../buttons/deployment_delete.js";
import leaveDeployment from "../buttons/deployment_leave.js";
import host from "../buttons/queue_host.js";
import join from "../buttons/queue_join.js";
import leave from "../buttons/queue_leave.js";
import { DeploymentEditButton } from "../interactions/deployment_edit.js";
import { DeploymentNewButton } from "../interactions/deployment_new.js";
import { userIsOnCooldownWithReply } from "../utils/interaction/checkCooldown.js";

const _kButtons: Map<string, Button> = new Map();

_kButtons.set(deleteDeployment.id, deleteDeployment);
_kButtons.set(DeploymentEditButton.id, DeploymentEditButton);
_kButtons.set(host.id, host);
_kButtons.set(join.id, join);
_kButtons.set(leave.id, leave);
_kButtons.set(leaveDeployment.id, leaveDeployment);
_kButtons.set(DeploymentNewButton.id, DeploymentNewButton);

function getButtonById(id: string): Button | undefined {
	return _kButtons.get(id);
}

export default {
	callback: async function (interaction: ButtonInteraction) {
		const button = getButtonById(interaction.customId) || getButtonById(interaction.customId.split("-")[0]);
		if (!button) {
			throw new Error(`Button: ${interaction.customId} not found!`);
		}

		if (await checkBlacklist(interaction, button.blacklistedRoles)) { return; }
		if (!await hasRequiredRoles(interaction, button.requiredRoles)) { return; }
		if (!await hasRequiredPermissions(interaction, button.permissions)) { return; }
		if (await userIsOnCooldownWithReply(interaction, button.id, button.cooldown)) { return; }


		log(`${colors.cyan('[Button Clicked]')} ${colors.yellow(interaction.customId)} ${colors.blue('||')} ${colors.green('Author:')} ${colors.magenta(interaction.user.username)}`);
		await button.callback({ interaction });
	},
}

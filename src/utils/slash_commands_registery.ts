import Command from "../classes/Command.js";
import clear_queue from "../commands/clear_queue.js";
import { DeploymentRemoveCommand } from "../commands/deployment_remove.js";
import panel from "../commands/panel.js";
import queue_panel from "../commands/queue_panel.js";
import set_deployment_time from "../commands/set_deployment_time.js";
import togglestrikemode from "../commands/togglestrikemode.js";

const _kCommands: Map<string, Command> = new Map();

_kCommands.set(clear_queue.name, clear_queue);
_kCommands.set(panel.name, panel);
_kCommands.set(queue_panel.name, queue_panel);
_kCommands.set(DeploymentRemoveCommand.name, DeploymentRemoveCommand);
_kCommands.set(set_deployment_time.name, set_deployment_time);
_kCommands.set(togglestrikemode.name, togglestrikemode);

export function getSlashCommand(name: string): Command {
    const command = _kCommands.get(name);
    if (!command) {
        throw new Error(`Command: ${name} not found!`);
    }
    return command;
}

export function getAllSlashCommands() {
    return Array.from(_kCommands.values());
}

import { CommandV2 } from "../classes/Command.js";
import { SetDeploymentTimeCommand } from "../commands/set_deployment_time.js";

const _kCommands: Map<string, CommandV2> = new Map();

// _kCommands.set(clear_queue.name, clear_queue);
// _kCommands.set(panel.name, panel);
// _kCommands.set(queue_panel.name, queue_panel);
// _kCommands.set(remove.name, remove);
// _kCommands.set(togglestrikemode.name, togglestrikemode);
_kCommands.set(SetDeploymentTimeCommand.name, SetDeploymentTimeCommand);

export function getSlashCommand(name: string) {
    const command = _kCommands.get(name);
    if (!command) {
        throw new Error(`Command: ${name} not found!`);
    }
    return command;
}

export function getAllSlashCommands(): Array<CommandV2> {
    return Array.from(_kCommands.values());
}

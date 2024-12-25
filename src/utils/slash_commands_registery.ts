import Slashcommand from "../classes/Slashcommand.js";
import clear_queue from "../commands/clear_queue.js";
import panel from "../commands/panel.js";
import queue_panel from "../commands/queue_panel.js";
import remove from "../commands/remove.js";
import set_deployment_time from "../commands/set_deployment_time.js";
import togglestrikemode from "../commands/togglestrikemode.js";

const _kCommands: Map<string, Slashcommand> = new Map();

_kCommands.set(clear_queue.name, clear_queue);
_kCommands.set(panel.name, panel);
_kCommands.set(queue_panel.name, queue_panel);
_kCommands.set(remove.name, remove);
_kCommands.set(set_deployment_time.name, set_deployment_time);
_kCommands.set(togglestrikemode.name, togglestrikemode);

export function getSlashCommand(name: string): Slashcommand {
    return _kCommands.get(name);
}

export function getAllSlashCommands() {
    return Array.from(_kCommands.values());
}
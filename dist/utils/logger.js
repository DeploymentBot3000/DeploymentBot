import colors from "colors";
import config from "../config.js";
export function log(text) {
    const date = new Date().toTimeString().split(/ +/)[0];
    console.log(colors.green(`[${date}]: ${text}`));
}
export function error(text) {
    const date = new Date().toTimeString().split(/ +/)[0];
    if (config.debugMode) {
        if (text instanceof String)
            console.log(colors.red(`[${date}]: ${text}`));
        if (text instanceof Error)
            console.error(text);
    }
    else {
        console.log(colors.red(`[${date}]: ${text}`));
    }
}

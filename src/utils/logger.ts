import colors from "colors";
import config from "../config.js";

export function log(text: string, context?: string) {
	const date = new Date().toTimeString().split(/ +/)[0];
	const contextStr = context ? colors.blue(`[${context}]`) : '';
	console.log(colors.green(`[${date}]${contextStr}: ${text}`));
}

export function success(text: string, context?: string) {
	const date = new Date().toTimeString().split(/ +/)[0];
	const contextStr = context ? colors.blue(`[${context}]`) : '';
	console.log(colors.green(`[${date}]${contextStr}: ${text}`));
}

export function warn(text: string, context?: string) {
	const date = new Date().toTimeString().split(/ +/)[0];
	const contextStr = context ? colors.blue(`[${context}]`) : '';
	console.log(colors.yellow(`[${date}]${contextStr}: ${text}`));
}

export function error(text: String | Error, context?: string) {
	const date = new Date().toTimeString().split(/ +/)[0];
	const contextStr = context ? colors.blue(`[${context}]`) : '';
	
	if (config.debugMode) {
		if (text instanceof Error) {
			console.log(colors.red(`[${date}]${contextStr}: Error: ${text.message}`));
			console.error(colors.red(text.stack));
		} else {
			console.log(colors.red(`[${date}]${contextStr}: ${text}`));
		}
	} else {
		console.log(colors.red(`[${date}]${contextStr}: ${text}`));
	}
}

export function debug(text: string, context?: string) {
	if (config.debugMode) {
		const date = new Date().toTimeString().split(/ +/)[0];
		const contextStr = context ? colors.blue(`[${context}]`) : '';
		console.log(colors.gray(`[${date}]${contextStr}: ${text}`));
	}
}

export function action(text: string, context?: string) {
	const date = new Date().toTimeString().split(/ +/)[0];
	const contextStr = context ? colors.blue(`[${context}]`) : '';
	console.log(colors.magenta(`[${date}]${contextStr}: ${text}`));
}

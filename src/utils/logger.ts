import colors from "colors";
import { DateTime } from "luxon";

export enum LogLevel {
	FATAL,
	ERROR,
	WARNING,
	INFO,
	VERBOSE,
	DEBUG,
};

class Logger {
	level = LogLevel.INFO;

	log(level: LogLevel, payload: any, context?: string): void | never {
		if (level <= this.level) {
			const color = _logLevelColor(level);
			console.log(DateTime.now().toISO(), color(LogLevel[level].padEnd(this._padLength, ' ')), context ? ` [${context}]` : '', payload);
		}
		if (level == LogLevel.FATAL) {
			process.exit(1);
		}
	}

	private _padLength = Math.max(...Object.keys(LogLevel).map(l => l.length));
};

function _logLevelColor(level: LogLevel) {
	switch (level) {
		case LogLevel.FATAL: return colors.red;
		case LogLevel.ERROR: return colors.red;
		case LogLevel.WARNING: return colors.yellow;
		case LogLevel.INFO: return colors.reset;
		case LogLevel.VERBOSE: return colors.reset;
		case LogLevel.DEBUG: return colors.gray;
	}
}

export const logger = new Logger();

export function fatal(payload: any, context?: string): never {
	logger.log(LogLevel.FATAL, payload, context);
	process.exit(1);
}

export const error = logger.log.bind(logger, LogLevel.ERROR);
export const warn = logger.log.bind(logger, LogLevel.WARNING);
export const info = logger.log.bind(logger, LogLevel.INFO);
export const verbose = logger.log.bind(logger, LogLevel.VERBOSE);

export function debug(payload: any, context?: string) {
	logger.log(LogLevel.DEBUG, colors.gray(payload), context ? colors.gray(context) : undefined);
}

export function success(payload: any, context?: string) {
	logger.log(LogLevel.INFO, payload, colors.green(context ? `SUCCESS:${context}` : 'SUCCESS'));
}

export function action(payload: any, context?: string) {
	logger.log(LogLevel.INFO, payload, colors.blue(context ? `ACTION:${context}` : 'ACTION'));
}

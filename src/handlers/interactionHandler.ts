import fs from "fs";
import path from "path";
import { client } from "../index.js";
import { fileURLToPath } from 'url';
import { convertURLs } from "../utils/windowsUrlConvertor.js";

export default {
	/**
	 * @description Registers all the commands, context menus, buttons, modals and select menus
	 * @author MX1D
	 */
	init: async function () {
		const dirs = ["commands", "slashCommands", "contextMenus", "buttons", "modals", "selectMenus"];
		for (const dir of dirs) {
			await register(dir);
		}
	}
};

/**
 * @param { String } dir - The directory to register
 */
async function register(dir: string) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	const dirName = dir;
	dir = path.resolve(__dirname, `../${dir}/`);
	const dirExists = fs.existsSync(dir);
	if (!dirExists) fs.mkdirSync(dir);
	const files = fs.readdirSync(dir);

	for (const file of files) {
		if (file.endsWith(".js") || file.endsWith(".ts")) {
			const fileToImport = process.platform === "win32" ? `${convertURLs(dir)}/${file}` : `${dir}/${file}`;
			const interaction = (await import(fileToImport)).default;
			if (!interaction) continue;
			let identifier: string | undefined;
			if (dir.endsWith("commands") || dir.endsWith("slashCommands") || dir.endsWith("contextMenus")) identifier = interaction.name;
			else if (dir.endsWith("buttons") || dir.endsWith("modals") || dir.endsWith("selectMenus")) identifier = interaction.id;

			if (!identifier) throw new Error(`No name or id found for ${dir}/${file}. Did I maybe mess up?`);
			client[dirName].set(identifier, interaction);

		} else {
			if (fs.statSync(process.platform === "win32" ? `${(dir)}\\${file}` : `${dir}/${file}`).isDirectory()) {
				const directories = fs.readdirSync(process.platform === "win32" ? `${(dir)}\\${file}` : `${dir}/${file}`)
				directories.forEach(async file2 => {
					if (file2.endsWith(".js") || file2.endsWith(".ts")) {
						const fileToImport = process.platform === "win32" ? `${convertURLs(dir)}/${file}/${file2}` : `${dir}/${file}/${file2}`;
						const interaction = (await import(fileToImport)).default;
						let identifier: string | undefined;
						if (dir.endsWith("commands") || dir.endsWith("slashCommands") || dir.endsWith("contextMenus")) identifier = interaction.name;
						else if (dir.endsWith("buttons") || dir.endsWith("modals") || dir.endsWith("selectMenus")) identifier = interaction.id;

						if (!identifier) throw new Error(`No name or id found for ${dir}/${file}/${file2}. Did I maybe mess up?`);
						client[dirName].set(identifier, interaction);
					}
				});
				continue;
			}
		}
	}
}

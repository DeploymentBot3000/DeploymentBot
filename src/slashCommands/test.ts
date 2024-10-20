import { ApplicationCommandOptionType } from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";

export default new Slashcommand({
	name: "test",
	description: "testing",
	permissions: ["Administrator"],
	requiredRoles: [],
	cooldown: 0,
	options: [{ name: "what", description: "you want what?", required: true, type: ApplicationCommandOptionType.String }],
	func: ({ interaction }) => {
		interaction.reply({ content: `you said: ${interaction.options.getString("what")}`, ephemeral: true });
	}}
);
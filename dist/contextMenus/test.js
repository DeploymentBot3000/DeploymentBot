import { ApplicationCommandType } from "discord.js";
export default {
    name: "test",
    type: ApplicationCommandType.Message,
    function: async function ({ interaction }) {
        const { client } = await import("../index.js");
        interaction.reply("test");
    },
};

import Command from "../classes/Command.js";

export default new Command({
    name: "test",
    description: "testing",
    aliases: [],
    cooldown: 0,
    permissions: ["Administrator"],
    requiredRoles: [],
    func: async ({ message, args }) => {
        if (!args[0]) {
            const msg = await message.reply({ content: "you didn't say anything!" });

            message.delete();
            return setTimeout(() => msg.delete(), 5000);
        }
        const msg = await message.reply({ content: `you said: ${args.join(" ")}` });
        
        message.delete();
        setTimeout(() => msg.delete(), 5000);
    }
})
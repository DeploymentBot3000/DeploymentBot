// Example
// import Command from "../classes/Command.js";
// import config from "../config.js";
//
// export default new Command({
//     name: "test",
//     description: "testing",
//     aliases: [],
//     cooldown: 0,
//     permissions: ["Administrator"],
//     requiredRoles: [],
//     blacklistedRoles: [],
//     func: async ({ message, args }) => {
//         if (!args[0]) {
//             const msg = await message.reply({ content: "you didn't say anything!" });
//
//             await message.delete();
//             return setTimeout(() => msg.delete(), 5000);
//         }
//         const msg = await message.reply({ content: `you said: ${args.join(" ")}` });
//
//         await message.delete();
//         setTimeout(() => msg.delete(), 5000);
//     }
// })
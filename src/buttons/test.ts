import Button from "../classes/Button.js";
import config from "../config.js";

export default new Button({
    id: "test",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    func: async function ({ interaction }) {
        await interaction.reply({ content: "You clicked the button!", ephemeral: true });
    },
})
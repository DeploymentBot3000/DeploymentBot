import Button from "../classes/Button.js";

export default new Button({
    id: "test",
    cooldown: 0,
    permissions: [],
    requiredRoles: [],
    func: async function ({ interaction }) {
        await interaction.reply({ content: "You clicked the button!", ephemeral: true });
    },
})
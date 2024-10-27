import {EmbedBuilder} from "discord.js";

// "Hacked" the embed builder to bypass name empty string restrictions
export default class HackedEmbedBuilder extends EmbedBuilder {
    addFields(...fields) {
        // Map over fields and remove the validation on the `name` field
        fields = fields.map(field => ({
            name: field.name ?? '', // Allow empty string as a valid `name` field
            value: field.value ?? '', // Allow empty string as a valid `value` field
            inline: field.inline || false,
        }));

        // Pass modified fields to the parent class's `addFields` method without triggering validation
        this.data.fields = (this.data.fields || []).concat(fields);
        return this;
    }
}
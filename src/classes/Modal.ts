import { ModalSubmitInteraction } from "discord.js";

/**
 * @class Modal
 * @description A class that represents a modal
 * @param {string} id The id of the modal
 * @param {function} func The function to run when the modal is submitted
 */
export default class Modal {
    public id: string;
    public function: (params: {
        interaction: ModalSubmitInteraction;
    }) => void;
    public constructor({ id, func }: { id: string, func: (params: {
        interaction: ModalSubmitInteraction;
    }) => void }) {
        this.id = id;
        this.function = func;
    }
}
import { ModalSubmitInteraction } from "discord.js";

/**
 * @class Modal
 * @description A class that represents a modal
 * @param {string} id The id of the modal
 * @param {function} callback The function to run when the modal is submitted
 */
export default class Modal {
    public id: string;
    public callback: (params: {
        interaction: ModalSubmitInteraction;
    }) => void;
    public constructor({ id, callback }: {
        id: string, callback: (params: {
        interaction: ModalSubmitInteraction;
    }) => void }) {
        this.id = id;
        this.callback = callback;
    }
}
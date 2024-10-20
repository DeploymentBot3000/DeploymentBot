/**
 * @class Modal
 * @description A class that represents a modal
 * @param {string} id The id of the modal
 * @param {function} func The function to run when the modal is submitted
 */
export default class Modal {
    id;
    function;
    constructor({ id, func }) {
        this.id = id;
        this.function = func;
    }
}

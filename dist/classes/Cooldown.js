/**
 * @class Cooldown
 * @classdesc Represents a cooldown
 * @param {string} id The id of the cooldown
 * @param {number} time The time of the cooldown
 */
export default class Cooldown {
    id;
    time;
    timestamp;
    constructor(id, time) {
        this.id = id;
        this.time = time;
        this.timestamp = Date.now();
    }
    isExpired() {
        return Date.now() - this.timestamp > this.time;
    }
    getRemainingTime() {
        return this.time - (Date.now() - this.timestamp);
    }
}

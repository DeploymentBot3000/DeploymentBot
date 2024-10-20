/**
 * @class Cooldown
 * @classdesc Represents a cooldown
 * @param {string} id The id of the cooldown
 * @param {number} time The time of the cooldown
 */
export default class Cooldown {
    public id: string;
    public time: number;
    public timestamp: number;
    public constructor(id: string, time: number) {
        this.id = id;
        this.time = time;
        this.timestamp = Date.now();
    }
    public isExpired(): boolean {
        return Date.now() - this.timestamp > this.time;
    }
    public getRemainingTime(): number {
        return this.time - (Date.now() - this.timestamp);
    }
}
import { Duration } from "luxon";
import { parseStartTime } from "./time.js";

describe("Math functions", () => {
    it("should add two numbers correctly", () => {
        expect(parseStartTime("60m")).toEqual(Duration.fromDurationLike({ minutes: 20 }));
    });
});

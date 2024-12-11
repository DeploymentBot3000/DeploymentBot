import fs from "fs/promises";
import { Duration } from "luxon";
import { registerStartQueuedGameInterval } from "./startQueuedGame.js";

// Returns the interval between hot drop deployments.
// In strike mode this servers as the time until the strike begins.
export async function getDeploymentInterval() {
    return Duration.fromMillis(Number(await fs.readFile("./deploymentTime.txt", "utf-8")));
};

export async function setDeploymentInterval(deploymentInterval: Duration) {
    await fs.writeFile("./deploymentTime.txt", deploymentInterval.toMillis().toString(), "utf-8");

    registerStartQueuedGameInterval(deploymentInterval);
};

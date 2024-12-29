import { ActionRowBuilder, ModalBuilder, ModalSubmitFields, TextInputBuilder, TextInputStyle } from "discord.js";
import { Duration } from "luxon";
import * as emoji from 'node-emoji';
import { DeploymentDetails } from "../utils/deployments.js";
import { parseStartTime } from "../utils/time.js";

export enum DeploymentFields {
    TITLE = 'title',
    DIFFICULTY = 'difficulty',
    DESCRIPTION = 'description',
    START_TIME = 'startTime',
}

export function buildNewDeploymentModal(title: string, difficulty: string, description: string) {
    return _buildDeploymentModalInternal('New Deployment', 'newDeployment', title || '', difficulty || '', description || '', /*startTime=*/'');
}

export function buildEditDeploymentModal(deploymentId: number, title: string, difficulty: string, description: string, startTime: string) {
    return _buildDeploymentModalInternal('Edit Deployment', `editDeployment-${deploymentId}`, title, difficulty, description, startTime);
}

function _buildDeploymentModalInternal(modalTitle: string, customId: string, title: string, difficulty: string, description: string, startTime: string) {
    const rows: ActionRowBuilder<TextInputBuilder>[] = [];
    if (title != null) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId(DeploymentFields.TITLE).setLabel("Title").setPlaceholder("Deployment Title").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50).setValue(title)
            ) as ActionRowBuilder<TextInputBuilder>
        );
    }
    if (difficulty != null) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId(DeploymentFields.DIFFICULTY).setLabel("Difficulty").setPlaceholder("Deployment Difficulty").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(15).setValue(difficulty)
            ) as ActionRowBuilder<TextInputBuilder>
        );
    }
    if (description != null) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId(DeploymentFields.DESCRIPTION).setLabel("Description").setPlaceholder("Deployment Description").setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(description)
            ) as ActionRowBuilder<TextInputBuilder>
        );
    }
    if (startTime != null) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId(DeploymentFields.START_TIME).setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH:MM UTC(+/-)X").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(100).setValue(startTime)
            ) as ActionRowBuilder<TextInputBuilder>
        );
    }
    return new ModalBuilder().setTitle(modalTitle).setCustomId(customId).addComponents(rows);
}

export function getDeploymentModalValues(fields: ModalSubmitFields) {
    const detailsRaw = getDeploymentModalValuesRaw(fields);
    if (_hasEmoji(detailsRaw.title || '') || _hasEmoji(detailsRaw.difficulty || '') || _hasEmoji(detailsRaw.description || '')) {
        return new Error('Emojis are not allowed in deployment fields');
    }
    const details: DeploymentDetails = {
        title: detailsRaw.title,
        difficulty: detailsRaw.difficulty,
        description: detailsRaw.description,
        startTime: null,
        endTime: null,
    };
    if (detailsRaw.startTime) {
        const startTime = parseStartTime(detailsRaw.startTime);
        if (startTime instanceof Error) {
            return startTime;
        }
        details.startTime = startTime;
        details.endTime = startTime.plus(Duration.fromDurationLike({ hours: 2 }));
    }
    return details;
}

export function getDeploymentModalValuesRaw(fields: ModalSubmitFields) {
    const details = {
        title: null as string,
        difficulty: null as string,
        description: null as string,
        startTime: null as string,
    };
    for (const field of fields.fields.values()) {
        switch (field.customId) {
            case DeploymentFields.TITLE:
                details.title = field.value;
                break;
            case DeploymentFields.DIFFICULTY:
                details.difficulty = field.value;
                break;
            case DeploymentFields.DESCRIPTION:
                details.description = field.value;
                break;
            case DeploymentFields.START_TIME: {
                details.startTime = field.value;
                break;
            }
            default:
                throw new Error(`Unknown field: ${field.customId}`);
        }
    }
    return details;
}

function _hasEmoji(input: string): boolean {
    return input != emoji.strip(emoji.emojify(input));
}

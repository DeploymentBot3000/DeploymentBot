import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

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

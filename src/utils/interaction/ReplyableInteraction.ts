import {
    CommandInteraction,
    ButtonInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction,
    RoleSelectMenuInteraction,
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    ModalSubmitInteraction,
} from 'discord.js';

type ReplyableInteraction =
    | CommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | UserSelectMenuInteraction
    | RoleSelectMenuInteraction
    | ChannelSelectMenuInteraction
    | MentionableSelectMenuInteraction
    | ModalSubmitInteraction;

export default ReplyableInteraction;
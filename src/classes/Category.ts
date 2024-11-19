import {CategoryChannel, ChannelType, VoiceState} from "discord.js";
import config from "../config.js";
import StrikeCategory from "../tables/StrikeCatagory.js";
import {client} from "../index.js";
import VoiceChannel from "../tables/VoiceChannel.js";
import {error, log} from "../utils/logger.js";
import {LessThanOrEqual} from "typeorm";
import {DateTime} from "luxon";

export default class Category {
    public id: string;
    private categoryChannel: CategoryChannel;
    private boundEventListener: (oldState: VoiceState, newState: VoiceState) => Promise<null>;

    constructor() {}

    public async init(): Promise<Category> {
        try {
            const guild = client.guilds.cache.get(config.guildId);
            const deploymentsCategory = await guild.channels.fetch(config.vcCategory) as CategoryChannel;
            const offset = (await StrikeCategory.find()).length;
            if (!deploymentsCategory) throw new Error("Deployments category not found!");

            const category = await guild.channels.create({
                name: `Strike Groups [${offset + 1}]`,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
                    { id: config.verifiedRoleId, allow: ["ViewChannel", "Connect"] },
                ],
            });

            await category.setPosition(deploymentsCategory.position + (1 + offset));
            await StrikeCategory.insert({ guild: guild.id, categoryId: category.id });

            this.id = category.id;
            this.categoryChannel = category;
            this.boundEventListener = this.categoryEventListener.bind(this);
            client.battalionStrikeCategories.set(this.id, this);
            client.on("voiceStateUpdate", this.boundEventListener);

            return this;
        } catch (err) {
            error(`Failed to initialize category: ${err.message}`, "Strike System");
            return null;
        }
    }

    public async reinit(id: string):Promise<string> {
        try{
            const guild = client.guilds.cache.get(config.guildId);
            const category = await guild.channels.fetch(id) as CategoryChannel;

            this.id = category.id;
            this.categoryChannel = category;
            this.boundEventListener = this.categoryEventListener.bind(this);
            client.battalionStrikeCategories.set(this.id, this);
            client.on("voiceStateUpdate", this.boundEventListener);
            return category.name;
        } catch (err) {
            error(`Failed to initialize category: ${err.message}`, "Strike System");
            return null;
        }
    }

    private categoryEventListener = async (oldState: VoiceState, newState: VoiceState): Promise<null> => {
        const channel = oldState.channel || newState.channel;
        if (!(channel.parent.id === this.categoryChannel.id)) return;
        const vc = await VoiceChannel.findOne({
            where: { channel: channel.id, expires: LessThanOrEqual(DateTime.now().toMillis()) },
        });
        if (!vc) return;

        if (channel && !channel.members.size) {
            await channel.delete().catch((err) => console.log(err));
            await vc.remove().catch((err) => console.log(err));
            log(`Expired & empty channel ${channel.id} deleted`, "Strike System");
        }

        if (await this.isEmpty()) {
            await this.delete();
        }
    };

    public async isEmpty(): Promise<boolean> {
        try {
            const category = await StrikeCategory.findOne({ where: { categoryId: this.categoryChannel.id } });
            const categoryChannel = await client.channels.fetch(category.categoryId) as CategoryChannel;
            return categoryChannel.children.cache.size === 0;
        } catch (err) {
            error(`Failed to check category size: ${err.message}`, "Strike System");
            return null;
        }
    }

    public async delete(): Promise<void> {
        try {
            const category = await StrikeCategory.findOne({ where: { categoryId: this.categoryChannel.id } });
            await this.categoryChannel.delete();
            await category.remove();
            client.off("voiceStateUpdate", this.boundEventListener);
        } catch (err) {
            error(`Failed to delete category: ${err.message}`, "Strike System");
            return null;
        }
    }
}
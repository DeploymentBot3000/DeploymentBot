import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity()
export default class VoiceChannel extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    guild: string;

    @Column()
    channel: string;
    
    @Column({ type: "bigint" })
    expires: number;
}
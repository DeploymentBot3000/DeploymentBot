import { Entity, Column, BaseEntity, PrimaryColumn } from "typeorm";

@Entity()
export default class Settings extends BaseEntity {
    @PrimaryColumn()
    guildId: string;

    @PrimaryColumn()
    name: string;

    @Column()
    value: string;
}

import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";

@Entity()
export default class Settings extends BaseEntity {
    @PrimaryColumn()
    guild_id: string;

    @PrimaryColumn()
    key: string;

    @Column()
    value: string;
}

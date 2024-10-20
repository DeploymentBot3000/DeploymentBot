import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity()
export default class QueueStatusMsg extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    channel: string;

    @Column()
    message: string;
}
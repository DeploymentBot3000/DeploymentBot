import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity()
export default class Deployment extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    channel: string;

    @Column()
    message: string;

    @Column()
    user: string;

    @Column()
    title: string;

    @Column()
    difficulty: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: "bigint" })
    startTime: number;

    @Column({ type: "bigint" })
    endTime: number;

    @Column({ nullable: true })
    noticeSent: boolean;

    @Column({ nullable: true })
    started: boolean;

    @Column({ default: false })
    deleted: boolean;

    @Column({ default: false })
    edited: boolean;
}

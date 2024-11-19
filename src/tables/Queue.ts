import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity()
export default class Queue extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user: string;

    @Column({ type: "boolean" })
    host: boolean;

    @Column({ nullable: true })
    receiptMessageId: string;

    @Column({ type: "timestamp", nullable: true })
    joinTime: Date;
}   
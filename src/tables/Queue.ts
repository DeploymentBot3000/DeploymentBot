import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity()
export default class Queue extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user: string;

    @Column({ type: "boolean" })
    isHost: boolean;

    @Column({ type: "timestamp" })
    joinTime: Date;
}

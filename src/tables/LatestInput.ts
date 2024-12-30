import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class LatestInput extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column()
    title: string;

    @Column()
    difficulty: string;

    @Column({ type: 'text' })
    description: string;

    @Column()
    startTime: string;
}

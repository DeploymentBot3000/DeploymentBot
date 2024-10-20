import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

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

    @Column()
    description: string;
}
import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export default class StrikeCategory extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    guild: string;

    @Column()
    categoryId: string;
}
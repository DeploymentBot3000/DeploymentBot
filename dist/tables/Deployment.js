var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
let Deployment = class Deployment extends BaseEntity {
    id;
    channel;
    message;
    user;
    title;
    difficulty;
    description;
    startTime;
    endTime;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Deployment.prototype, "id", void 0);
__decorate([
    Column(),
    __metadata("design:type", String)
], Deployment.prototype, "channel", void 0);
__decorate([
    Column(),
    __metadata("design:type", String)
], Deployment.prototype, "message", void 0);
__decorate([
    Column(),
    __metadata("design:type", String)
], Deployment.prototype, "user", void 0);
__decorate([
    Column(),
    __metadata("design:type", String)
], Deployment.prototype, "title", void 0);
__decorate([
    Column(),
    __metadata("design:type", String)
], Deployment.prototype, "difficulty", void 0);
__decorate([
    Column(),
    __metadata("design:type", String)
], Deployment.prototype, "description", void 0);
__decorate([
    Column({ type: "bigint" }),
    __metadata("design:type", Number)
], Deployment.prototype, "startTime", void 0);
__decorate([
    Column({ type: "bigint" }),
    __metadata("design:type", Number)
], Deployment.prototype, "endTime", void 0);
Deployment = __decorate([
    Entity()
], Deployment);
export default Deployment;

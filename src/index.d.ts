import { Client } from 'discord.js';

declare module 'discord.js' {
  export interface Client {
    nextGame: Date;
    interval: NodeJS.Timeout;
  }
}

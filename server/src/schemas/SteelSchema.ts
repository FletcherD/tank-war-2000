import { Schema, type } from "@colyseus/schema";

export class SteelSchema extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") value: number = 0;
  @type("number") createdAt: number = 0;
}
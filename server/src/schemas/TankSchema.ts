import { Schema, type } from "@colyseus/schema";

export class TankSchema extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("number") speed: number = 0;
  @type("number") health: number = 100;
  @type("number") team: number = 0;
  @type("boolean") left: boolean = false;
  @type("boolean") right: boolean = false;
  @type("boolean") up: boolean = false;
  @type("boolean") down: boolean = false;
  @type("boolean") fire: boolean = false;
  @type("number") tick: number = 0;
}
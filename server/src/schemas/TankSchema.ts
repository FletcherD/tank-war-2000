import { Schema, type } from "@colyseus/schema";
import { PHYSICS } from "../../../shared/constants";

export class TankSchema extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") heading: number = 0;
  @type("number") speed: number = 0;
  @type("number") health: number = 100;
  @type("number") ammo: number = PHYSICS.TANK_MAX_AMMO;
  @type("number") team: number = 0;
  @type("boolean") left: boolean = false;
  @type("boolean") right: boolean = false;
  @type("boolean") up: boolean = false;
  @type("boolean") down: boolean = false;
  @type("boolean") fire: boolean = false;
  @type("number") tick: number = 0;
  @type("number") pillboxCount: number = 0; // Number of pillboxes in inventory
  @type("number") steel: number = 0; // Amount of steel resource
}
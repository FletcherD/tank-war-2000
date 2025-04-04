import { Schema, type } from "@colyseus/schema";

export class BulletSchema extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") rotation: number = 0;
    @type("number") team: number = 0;
    @type("string") id: string = "";
    @type("string") ownerId: string = ""; // ID of the tank or pillbox that fired it
    @type("string") ownerName: string = ""; // Name of the tank or pillbox that fired it
}
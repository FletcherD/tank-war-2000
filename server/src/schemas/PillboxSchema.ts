import { Schema, type } from "@colyseus/schema";

export class PillboxSchema extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") team: number = 0;
    @type("number") health: number = 8; // Default pillbox health
    @type("string") id: string = "";
    @type("string") state: string = "pickup"; // "placed", "pickup", or "held"
}
import { Schema, type } from "@colyseus/schema";

export class StationSchema extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") team: number = 0;
    @type("string") id: string = "";
}
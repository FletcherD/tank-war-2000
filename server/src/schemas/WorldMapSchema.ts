import { Schema, type, ArraySchema } from "@colyseus/schema";

export class WorldMapSchema extends Schema {
  @type("string") mapName: string = "";
  @type("number") mapWidth: number = 0;
  @type("number") mapHeight: number = 0;
  @type(["uint16"]) tileIndices: ArraySchema<number> = new ArraySchema<number>();
}
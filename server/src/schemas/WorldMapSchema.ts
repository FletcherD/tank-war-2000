import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { SteelSchema } from "./SteelSchema";

export class WorldMapSchema extends Schema {
  @type("string") mapName: string = "";
  @type("number") mapWidth: number = 0;
  @type("number") mapHeight: number = 0;
  @type(["uint16"]) tileIndices: ArraySchema<number> = new ArraySchema<number>();
  @type({ map: SteelSchema }) steelResources: MapSchema<SteelSchema> = new MapSchema<SteelSchema>();
}
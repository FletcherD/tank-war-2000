import { GameMap } from "../../../shared/scenes/Map";
import { WorldMapSchema } from "../schemas/WorldMapSchema";
import { ArraySchema } from "@colyseus/schema";

export class ServerMap extends GameMap {
  schema: WorldMapSchema;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.schema = new WorldMapSchema();
  }

  setTile(x: number, y: number, tileIndex: number, applyWang: boolean = false, properties: { [key: string]: any } = null): Phaser.Tilemaps.Tile {
    const tile = super.setTile(x, y, tileIndex, applyWang, properties);
    
    // Update the schema tile indices
    if (this.schema && this.groundLayer) {
      const width = this.groundLayer.width;
      const index = y * width + x;
      this.schema.tileIndices[index] = tileIndex;
      
      // Broadcast tile change message to all clients
      const scene = this.scene as any;
      if (scene.room) {
        scene.room.broadcast("tileChanged", {
          x: x,
          y: y,
          tileIndex: tileIndex,
          applyWang: applyWang
        });
      }
    }
    
    return tile;
  }

  // Initialize the schema with map data
  initializeSchema() {
    if (!this.schema || !this.map) return;

    // Set basic map properties
    const mapData = this.scene.cache.json.get('mapData');
    this.schema.mapName = mapData.name || "Unknown Map";
    this.schema.mapWidth = this.map.width;
    this.schema.mapHeight = this.map.height;

    // Initialize tile indices array
    this.schema.tileIndices = new ArraySchema<number>();
    
    // Fill the array with initial tile indices
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        const decorationTile = this.decorationLayer.getTileAt(x, y);
        
        // Use the decoration tile index if it exists, otherwise use the ground tile index
        const tileIndex = decorationTile ? decorationTile.index : (tile ? tile.index : -1);
        this.schema.tileIndices.push(tileIndex);
      }
    }
  }

  createTilemapFromFile() {
    super.createTilemapFromFile();
    this.initializeSchema();
  }
}
import { GameMap } from "../../../shared/scenes/Map";
import { WorldMapSchema } from "../../../server/src/schemas/WorldMapSchema";
import Phaser from "phaser";

export class ClientMap extends GameMap {
    constructor(scene: Phaser.Scene) {
        super(scene);
    }

    // Create a tilemap from the schema received from the server
    createTilemapFromSchema(mapSchema: WorldMapSchema) {
        console.log(`Creating map from schema: ${mapSchema.mapName}, ${mapSchema.mapWidth}x${mapSchema.mapHeight}`);
        
        // Prepare two map arrays for two layers
        const mapDataLayer0 = [];
        const mapDataLayer1 = [];
        
        // Initialize both layers with empty tiles
        for (let y = 0; y < mapSchema.mapHeight; y++) {
            const row0 = [];
            const row1 = [];
            for (let x = 0; x < mapSchema.mapWidth; x++) {
                row0.push(-1); // -1 means no tile
                row1.push(-1);
            }
            mapDataLayer0.push(row0);
            mapDataLayer1.push(row1);
        }
        
        // Get the tileset data
        const tilesetData = this.scene.cache.json.get('tilesetData');
        
        // Read and add tile properties from tilesetData to the tileset
        const tileProperties = {};
        
        if (tilesetData.tiles) {
            for (const tileKey in tilesetData.tiles) {
                if (tilesetData.tiles[tileKey] && tilesetData.tiles[tileKey].properties) {
                    const props = tilesetData.tiles[tileKey].properties || [];
                    tileProperties[tileKey] = props;
                }
            }
        }
        
        // Fill the layers based on tile indices from schema
        for (let y = 0; y < mapSchema.mapHeight; y++) {
            for (let x = 0; x < mapSchema.mapWidth; x++) {
                const index = y * mapSchema.mapWidth + x;
                
                // Get tile value from schema
                let tileValue = mapSchema.tileIndices[index];
                
                if (tileValue === undefined || tileValue === null) continue;
                
                const tileId = tileValue.toString();
                let layerValue = 0; // Default to layer 0                
                
                // Check tile properties to determine layer
                if (tileProperties[tileId]) {
                    const layerProp = tileProperties[tileId].find(p => p.name === "layer");
                    if (layerProp) {
                        layerValue = layerProp.value;
                    }
                }
                
                // Add to the appropriate layer
                if (layerValue === 0) {
                    mapDataLayer0[y][x] = tileValue;
                } else {
                    mapDataLayer1[y][x] = tileValue;
                }
            }
        }
        
        // Get tileset properties from tileset.json
        const tileWidth = tilesetData.tileheight;
        const tileHeight = tilesetData.tileheight;
        
        // Create the tilemap using the data for layer 0
        this.map = this.scene.make.tilemap({
            data: mapDataLayer0,
            tileWidth: tileWidth, 
            tileHeight: tileHeight
        });
        
        // Add the tileset image using properties from tileset.json
        this.tileset = this.map.addTilesetImage(
            'tileset',         // In-game name for the tileset
            'tileset',         // Key of the image in the cache
            tileWidth,         // Width of each tile
            tileHeight,        // Height of each tile
            0,                 // Margin around the tileset
            0                  // Spacing between tiles
        );
      
        this.tileset.tileProperties = tileProperties;
        
        // Create both layers using the tileset
        this.groundLayer = this.map.createLayer(0, this.tileset, 0, 0);
        
        if (!this.groundLayer) {
            console.error("Failed to create ground layer");
            return;
        }
        
        // Create the decoration layer (layer 1) and add the tileset data
        this.decorationLayer = this.map.createBlankLayer('decoration', this.tileset, 0, 0);
        
        if (!this.decorationLayer) {
            console.error("Failed to create decoration layer");
            return;
        }
        
        // Fill the decoration layer with the layer 1 data
        for (let y = 0; y < mapDataLayer1.length; y++) {
            for (let x = 0; x < mapDataLayer1[y].length; x++) {
                const tileIndex = mapDataLayer1[y][x];
                if (tileIndex !== -1) {
                    try {
                        // Make sure the tile index is valid for the tileset
                        if (tileIndex < this.tileset.total) {
                            this.decorationLayer.putTileAt(tileIndex, x, y);
                        }
                    } catch (error) {
                        console.error(`Failed to place tile at (${x},${y}) with index ${tileIndex}: ${error.message}`);
                    }
                }
            }
        }
        
        // Ensure the decoration layer is drawn on top
        this.decorationLayer.setDepth(1);
        
        // Apply tile properties to both layers
        for (let y = 0; y < this.groundLayer.height; y++) {
            for (let x = 0; x < this.groundLayer.width; x++) {
                const tileLayer0 = this.groundLayer.getTileAt(x, y);
                if (tileLayer0) {
                    this.applyTileProperties(tileLayer0);
                }
                const tileLayer1 = this.decorationLayer.getTileAt(x, y);
                if (tileLayer1) {
                    this.applyTileProperties(tileLayer1);
                }
            }
        }
        
        // Create Matter physics bodies for the tilemap
        this.createMatterBodiesForTilemap();
    }
}
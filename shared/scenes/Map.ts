
export class GameMap {
    scene: Phaser.Scene;
    map: Phaser.Tilemaps.Tilemap;
    tileset: Phaser.Tilemaps.Tileset;
    groundLayer: Phaser.Tilemaps.TilemapLayer;
    decorationLayer: Phaser.Tilemaps.TilemapLayer;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    getTileAt(x: number, y: number): Phaser.Tilemaps.Tile {
        return this.groundLayer.getTileAt(x, y) || this.decorationLayer.getTileAt(x, y);
    }
    
    // Get the speed multiplier at the given world position
    // Returns a value between 0 and 1, with default of 1 if no speed property is found
    getSpeedAtPosition(x: number, y: number): number {
        if (!this.groundLayer) return 1.0;
        
        // Convert world position to tile position
        const tileX = this.groundLayer.worldToTileX(x);
        const tileY = this.groundLayer.worldToTileY(y);
        
        // Get the tile at this position
        let tile = this.groundLayer.getTileAt(tileX, tileY);
        if (!tile) { 
            tile = this.decorationLayer.getTileAt(tileX, tileY);
            if (!tile) return 1.0;
        }
        
        return tile.properties?.speed || 1.0;
    }

    createTilemapFromFile() {
        // Get the map data and tileset data from cache
        const mapData = this.scene.cache.json.get('mapData');
        const tilesetData = this.scene.cache.json.get('tilesetData');
        
        console.log("Loading tileset:", tilesetData.name);

        // Read and add tile properties from tilesetData to the tileset
        const tileProperties = {};
        // Loop through all tiles in the tileset data
        console.log(`Processing tileset data with ${tilesetData.tiles ? tilesetData.tiles.length : 0} tiles`);
        
        if (tilesetData.tiles) {
            for (const tileKey in tilesetData.tiles) {
                if (tilesetData.tiles[tileKey] && tilesetData.tiles[tileKey].properties) {
                    const props = tilesetData.tiles[tileKey].properties || [];
                    tileProperties[tileKey] = props;
                }
            }
        }

        // Prepare two map arrays for two layers
        const mapDataLayer0 = [];
        const mapDataLayer1 = [];
        
        // Initialize both layers with empty tiles
        for (let y = 0; y < mapData.size[1]; y++) {
            const row0 = [];
            const row1 = [];
            for (let x = 0; x < mapData.size[0]; x++) {
                row0.push(-1); // -1 means no tile
                row1.push(-1);
            }
            mapDataLayer0.push(row0);
            mapDataLayer0.push(row0.slice()); // Duplicate each row for the doubled resolution
            mapDataLayer1.push(row1);
            mapDataLayer1.push(row1.slice()); // Duplicate each row for the doubled resolution
        }
        
        // Fill the layers based on tile properties
        for (let y = 0; y < mapData.size[1]; y++) {
            for (let x = 0; x < mapData.size[0]; x++) {
                const index = y * mapData.size[0] + x;
                let tileValue = mapData.mapdata[index];

                // Change tile value 7 (deep sea) to 1 (water)
                // Artifact of conversion from original Bolo maps
                if (tileValue === 7) {
                    tileValue = 1;
                }
                
                //if (tileValue === 0) continue; // Skip empty tiles
                const tileIndex = tileValue * 64;
                
                const tileId = tileValue.toString();
                let layerValue = 0; // Default to layer 0                
                // Check tile properties to determine layer
                if (tileProperties[tileIndex]) {
                    const layerProp = tileProperties[tileIndex].find(p => p.name === "layer");
                    if (layerProp) {
                        layerValue = layerProp.value;
                    }
                }
                
                
                // Add to the appropriate layer
                if (layerValue === 0) {
                    mapDataLayer0[y*2][x*2] = tileIndex;
                    mapDataLayer0[y*2][(x*2)+1] = tileIndex;
                    mapDataLayer0[(y*2)+1][x*2] = tileIndex;
                    mapDataLayer0[(y*2)+1][(x*2)+1] = tileIndex;
                } else {
                    mapDataLayer1[y*2][x*2] = tileIndex;
                    mapDataLayer1[y*2][(x*2)+1] = tileIndex;
                    mapDataLayer1[(y*2)+1][x*2] = tileIndex;
                    mapDataLayer1[(y*2)+1][(x*2)+1] = tileIndex;
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
        
        // Create terrain tiles
        this.applyWangTiles();
    }

    getNeighborTiles(tile: Phaser.Tilemaps.Tile) {
        const neighbors = [
            {dx: -1, dy: 0}, // left
            {dx: -1, dy: 1}, // top-left
            {dx: 0, dy: 1},  // top
            {dx: 1, dy: 1},  // top-right
            {dx: 1, dy: 0},  // right
            {dx: 1, dy: -1}, // bottom-right
            {dx: 0, dy: -1},  // bottom
            {dx: -1, dy: -1}, // bottom-left
        ];
        
        return neighbors.map(({dx, dy}) => {
            const neighborTile = this.getTileAt(tile.x + dx, tile.y + dy);
            return neighborTile;
        });
    }

    getBaseTileType(tile: Phaser.Tilemaps.Tile): number {
        return Math.floor(tile.index / 64) * 64;
    }

    getTileBitmask(layer: Phaser.Tilemaps.TilemapLayer, x: number, y: number): number {
        // Create a bitmask indicating which of the 4 corner tiles match the center tile
        // Returns a bitmask where each bit represents a neighbor (clockwise from top-left):
        // 0x01: top-left, 0x02: top-right, 0x04: bottom-right, 0x08: bottom-left
        if (!layer) return 0;

        const isTileSameType = (tileA: Phaser.Tilemaps.Tile, tileB: Phaser.Tilemaps.Tile): boolean => {
            return this.getBaseTileType(tileA) === this.getBaseTileType(tileB);
        }
      
        const centerTile = layer.getTileAt(x, y);
        if (!centerTile) return 0;
      
        // Check all 8 neighbors
        const neighborTiles = this.getNeighborTiles(centerTile);
      
        let wang = [];
        for (const neighborTile of neighborTiles) {
            if (!neighborTile) {
                wang.push(true);
                continue;
            }
            wang.push(isTileSameType(neighborTile, centerTile));
        }

        let cornerMask = 0;
        cornerMask |= (wang[0] && wang[1] && wang[2] ? 0x01 : 0);
        cornerMask |= (wang[2] && wang[3] && wang[4] ? 0x02 : 0);
        cornerMask |= (wang[4] && wang[5] && wang[6] ? 0x04 : 0);
        cornerMask |= (wang[6] && wang[7] && wang[0] ? 0x08 : 0);
      
        return cornerMask;
    }

    getDefaultTileProperties(tileIndex: number): { [key: string]: any } {        
        // Get tileset data
        const tilesetData = this.scene.cache.json.get('tilesetData');
        
        // Find the properties for this tile
        const tileInfo = tilesetData.tiles.find(t => parseInt(t.id) === tileIndex);
        
        // Create a properties object for the tile if it doesn't exist
        if (!tileInfo.properties) {
            tileInfo.properties = {};
        }
        
        const properties: { [key: string]: any } = {};
        // Copy properties from tileset to the tile
        for (const prop of tileInfo.properties) {
            properties[prop.name] = prop.value;
        }
        return properties;
    }
    
    // Apply properties from tilesetData to the given tile object
    applyTileProperties(tile: Phaser.Tilemaps.Tile) {
        if (!tile) return;
        
        const properties = this.getDefaultTileProperties(tile.index);
        tile.properties = properties;
    }

    setTile(x: number, y: number, tileIndex: number, applyWang: boolean = false, properties: { [key: string]: any } = null) {
        let tile;
        if(properties == null) {
            properties = this.getDefaultTileProperties(tileIndex);
        }
        this.removeMatterBody(this.groundLayer.getTileAt(x, y));
        this.groundLayer.removeTileAt(x, y);
        this.decorationLayer.removeTileAt(x, y);
        if(properties.layer == 0) {
            tile = this.groundLayer.putTileAt(tileIndex, x, y);
        } else if (properties.layer == 1) {
            tile = this.decorationLayer.putTileAt(tileIndex, x, y);
        }
        tile.properties = properties;
        this.updateMatterBody(tile);

        if(applyWang) {
            this.applyWangTile(tile);
            for (const neighborTile of this.getNeighborTiles(tile)) {
                this.applyWangTile(neighborTile);
            }
        }

        return tile;
    }

    applyWangTiles() {
        // Apply Wang tiles to ground layer
        this.applyWangTilesToLayer(this.groundLayer);
      
        // Apply Wang tiles to decoration layer
        this.applyWangTilesToLayer(this.decorationLayer);
    }
    
    applyWangTile(tile: Phaser.Tilemaps.Tile) {
        if (tile) {
            const layer = tile.properties?.layer == 0 ? this.groundLayer : this.decorationLayer;
            const isAffectedByNeighbors = tile.properties?.isAffectedByNeighbors;
            if (isAffectedByNeighbors) {
                const bitmask = this.getTileBitmask(layer, tile.x, tile.y);
                tile.index = this.getBaseTileType(tile) + bitmask;
                // Alternate terrain variation based on offset so 2x2 tiles display correctly
                if (tile.x%2) {
                    tile.index += 16;
                }
                if (tile.y%2) {
                    tile.index += 32;
                }
            }
        }
    }
    // Helper method to apply Wang tiles to a specific layer
    applyWangTilesToLayer(layer: Phaser.Tilemaps.TilemapLayer) {
        if (!layer) return;
      
        // For each tile in the layer, get its bitmask and update its index
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < layer.width; x++) {
                const tile = layer.getTileAt(x, y);
                this.applyWangTile(tile);
            }
        }
    }

    updateMatterBody(tile: Phaser.Tilemaps.Tile) {
        if (tile.properties?.hasCollision) {
            const x = tile.pixelX + tile.width / 2;
            const y = tile.pixelY + tile.height / 2;
            
            // Create a static rectangle body at the tile's position
            const body = this.scene.matter.add.rectangle(x, y, tile.width, tile.height, {
                isStatic: true,
                label: 'wall'
            });
            (tile as any).body = body;
        }
    }
    
    removeMatterBody(tile: Phaser.Tilemaps.Tile) {
        if (tile && (tile as any).body) {
            this.scene.matter.world.remove((tile as any).body);
            (tile as any).body = null;
        }
    }
    
    createMatterBodiesForTilemap() {
        for (let y = 0; y < this.groundLayer.height; y++) {
            for (let x = 0; x < this.groundLayer.width; x++) {
                const tile = this.groundLayer.getTileAt(x, y);
                if (tile) {
                    this.updateMatterBody(tile);
                }
            }
        }
    }
    
    // Check if a 2x2 area is valid for pillbox placement
    isPillboxPlacementValid(startX: number, startY: number): boolean {
        // A valid pillbox placement requires:
        // 1. A 2x2 area of tiles
        // 2. None of the tiles can be water or wall
        // 3. None of the tiles can have collision
        
        // Check all 4 tiles in the 2x2 area
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                
                // Get the tile at this position
                const groundTile = this.groundLayer.getTileAt(x, y);
                const decorationTile = this.decorationLayer.getTileAt(x, y);
                
                // Check ground tile
                if (groundTile) {
                    // Check if it's water (tileIndex 1*64 = 64)
                    if (this.getBaseTileType(groundTile) === 64) {
                        return false;
                    }
                    
                    // Check if it has collision
                    if (groundTile.properties?.hasCollision) {
                        return false;
                    }
                }
                
                // Check decoration tile
                if (decorationTile) {
                    // Check if it has collision
                    if (decorationTile.properties?.hasCollision) {
                        return false;
                    }
                }
            }
        }
        
        // If we made it here, the area is valid
        return true;
    }
    
    // Check if the selection is a valid 2x2 area for pillbox placement
    isSelectionValidForPillbox(selectedTiles: { x: number, y: number }[]): boolean {
        // Check if we have exactly 4 tiles
        if (selectedTiles.length !== 4) {
            return false;
        }
        
        // Find the min and max x and y to see if we have a 2x2 area
        const minX = Math.min(...selectedTiles.map(t => t.x));
        const maxX = Math.max(...selectedTiles.map(t => t.x));
        const minY = Math.min(...selectedTiles.map(t => t.y));
        const maxY = Math.max(...selectedTiles.map(t => t.y));
        
        // Check if it's a 2x2 area
        if (maxX - minX !== 1 || maxY - minY !== 1) {
            return false;
        }
        
        // Check if all 4 tiles are valid for placement
        return this.isPillboxPlacementValid(minX, minY);
    }
}
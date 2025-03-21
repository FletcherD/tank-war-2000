import Phaser from "phaser";

export class GameMap {
    scene: Phaser.Scene;
    map: Phaser.Tilemaps.Tilemap;
    tileset: Phaser.Tilemaps.Tileset;
    groundLayer: Phaser.Tilemaps.TilemapLayer;
    decorationLayer: Phaser.Tilemaps.TilemapLayer;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    createTilemap() {
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
                const tileValue = mapData.mapdata[index];
                
                if (tileValue === 0) continue; // Skip empty tiles
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
        
        // Find tiles with collision from tileset data
        const collisionTileIds = [];
        if (tilesetData.tiles) {
            for (const tile of tilesetData.tiles) {
                if (tile && tile.properties && Array.isArray(tile.properties)) {
                    const hasCollision = tile.properties.find(prop => 
                        prop.name === "hasCollision" && prop.value === true);
                    
                    if (hasCollision) {
                        collisionTileIds.push(parseInt(tile.id));
                    }
                }
            }
        }
        
        console.log(`Setting collision for tile IDs: ${collisionTileIds.join(', ')}`);
        this.map.setCollision(collisionTileIds);
        
        // Create Matter physics bodies for the tilemap
        this.createMatterBodiesForTilemap();
        
        // Create terrain tiles
        this.applyWangTiles();
    }

    getTileBitmask(layer: Phaser.Tilemaps.TilemapLayer, x: number, y: number): number {
        if (!layer) return 0;

        const isTileSameType = (idA: number, idB: number): boolean => {
            return Math.floor(idA/64) === Math.floor(idB/64);
        }
      
        const centerTile = layer.getTileAt(x, y);
        if (!centerTile) return 0;
      
        // Check all 8 neighbors
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
      
        let wang = [];
        for (const {dx, dy} of neighbors) {
            const neighborTile = layer.getTileAt(x + dx, y + dy);
            const result = neighborTile && isTileSameType(neighborTile.index, centerTile.index);
            wang.push(result);
        }

        let cornerMask = 0;
        cornerMask |= (wang[0] && wang[1] && wang[2] ? 0x01 : 0);
        cornerMask |= (wang[2] && wang[3] && wang[4] ? 0x02 : 0);
        cornerMask |= (wang[4] && wang[5] && wang[6] ? 0x04 : 0);
        cornerMask |= (wang[6] && wang[7] && wang[0] ? 0x08 : 0);
      
        return cornerMask;
    }

    applyWangTiles() {
        // Create a bitmask indicating which of the 4 corner tiles match the center tile
        // Returns a bitmask where each bit represents a neighbor (clockwise from top-left):
        // 0x01: top-left, 0x02: top-right, 0x04: bottom-right, 0x08: bottom-left

        // Get tileset data
        const tilesetData = this.scene.cache.json.get('tilesetData');

        // Apply Wang tiles to ground layer
        this.applyWangTilesToLayer(this.groundLayer);
      
        // Apply Wang tiles to decoration layer
        this.applyWangTilesToLayer(this.decorationLayer);
    }
    
    // Helper method to apply Wang tiles to a specific layer
    applyWangTilesToLayer(layer: Phaser.Tilemaps.TilemapLayer) {
        if (!layer) return;
      
        // For each tile in the layer, get its bitmask and update its index
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < layer.width; x++) {
                const tile = layer.getTileAt(x, y);
                if (tile) {
                    const tileIndex = tile.index.toString();
                    const tileProperties = this.tileset.tileProperties[tileIndex];
                  
                    if (tileProperties && Array.isArray(tileProperties)) {
                        const isAffectedByNeighbors = tileProperties.find(prop => 
                            prop.name === "isAffectedByNeighbors" && prop.value === true);
                      
                        if (isAffectedByNeighbors) {
                            const bitmask = this.getTileBitmask(layer, x, y);
                            tile.index = tile.index + bitmask;
                            // Alternate terrain variation based on offset so 2x2 tiles display correctly
                            if (x%2) {
                                tile.index += 16;
                            }
                            if (y%2) {
                                tile.index += 32;
                            }
                        }
                    }
                }
            }
        }
    }
    
    createMatterBodiesForTilemap() {
        if (!this.groundLayer) {
            console.error("Ground layer is null, cannot create matter bodies");
            return;
        }
        
        try {
            // Get tileset data to check for collision properties
            const tilesetData = this.scene.cache.json.get('tilesetData');
            
            // Find tile IDs that should have collision based on tileset data
            const collisionTileIds = new Set<number>();
            
            if (tilesetData.tiles) {
                // Process tile collision properties safely
                for (const tile of tilesetData.tiles) {
                    if (tile && tile.properties && Array.isArray(tile.properties)) {
                        const hasCollision = tile.properties.find(prop => 
                            prop.name === "hasCollision" && prop.value === true);
                        
                        // Only add to collision if in layer 0 (ground layer)
                        const layerProp = tile.properties.find(prop => 
                            prop.name === "layer");
                        const layer = layerProp ? layerProp.value : 0;
                        
                        if (hasCollision && layer === 0 && tile.id !== undefined) {
                            collisionTileIds.add(parseInt(tile.id));
                        }
                    }
                }
            }
            
            // Filter tiles that have collision enabled
            let collisionTiles;
            if (collisionTileIds.size > 0) {
                collisionTiles = this.groundLayer.filterTiles(tile => {
                    // Get the base tile ID (without wang modifications)
                    const baseTileId = Math.floor(tile.index / 64) * 64;
                    return collisionTileIds.has(baseTileId);
                });
            } else {
                // Fallback to tile index 1 (walls)
                collisionTiles = this.groundLayer.filterTiles(tile => tile.index === 1);
            }
            
            console.log(`Creating physics bodies for ${collisionTiles.length} wall tiles`);
            
            // Create static bodies for each collision tile
            collisionTiles.forEach(tile => {
                const x = tile.pixelX + tile.width / 2;
                const y = tile.pixelY + tile.height / 2;
                
                // Create a static rectangle body at the tile's position
                const body = this.scene.matter.add.rectangle(x, y, tile.width, tile.height, {
                    isStatic: true,
                    label: 'wall'
                });
                
                // Set collision category for this wall
                this.scene.matter.body.setCollisionCategory(body, 0x0001); // WALL category
                this.scene.matter.body.setCollidesWith(body, [0x0002, 0x0004]); // PLAYER, PROJECTILE categories
            });
        } catch (error) {
            console.error("Error creating matter bodies:", error);
        }
    }
}
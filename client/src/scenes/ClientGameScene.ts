/**
 * ---------------------------
 * Phaser + Colyseus - Part 4.
 * ---------------------------
 * - Connecting with the room
 * - Sending inputs at the user's framerate
 * - Update other player's positions WITH interpolation (for other players)
 * - Client-predicted input for local (current) player
 * - Fixed tickrate on both client and server
 */

import Phaser from "phaser";
import { Room, Client, getStateCallbacks } from "colyseus.js";
import { BACKEND_URL } from "../backend";

// Import the state type from server-side code
import type { MyRoomState } from "../../../server/src/rooms/GameRoom";
import { GameScene, InputData } from "../../../shared/scenes/Game";
import { Tank } from "../../../shared/objects/Tank";
import { GameUI } from "../UI";
import { VISUALS } from "../../../shared/constants";

export class ClientGameScene extends GameScene {
    room: Room<MyRoomState>;

    currentPlayer: Tank;
    
    // UI instance
    gameUI: GameUI;

    debugFPS: Phaser.GameObjects.Text;
    debugTileInfo: Phaser.GameObjects.Text;

    localRef: Phaser.GameObjects.Rectangle;
    remoteRef: Phaser.GameObjects.Rectangle;

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    
    // Tile selection properties
    selectionStartTile: { x: number, y: number } | null = null;
    selectionEndTile: { x: number, y: number } | null = null;
    selectionRect: Phaser.GameObjects.Rectangle | null = null;
    selectedTiles: { x: number, y: number }[] = [];
    
    // Road building properties
    buildQueue: { 
        tile: { x: number, y: number }, 
        progress: number, 
        indicator: Phaser.GameObjects.Arc,
        worldX: number,
        worldY: number
    }[] = [];
    isBuilding: boolean = false;
    BUILD_TIME_PER_TILE: number = 1500; // milliseconds per tile
    MAX_BUILD_DISTANCE: number = 100; // maximum distance for building

    inputPayload: InputData = {
        left: false,
        right: false,
        up: false,
        down: false,
        fire: false,
        tick: 0,
    };

    async create() {
        console.log("ClientGameScene create");
        
        await super.create();

        this.cursorKeys = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.debugFPS = this.add.text(4, 4, "", { 
            color: "#ff0000", 
            fontFamily: "'Courier Prime', monospace",
            fontStyle: "bold"
        });
        this.debugTileInfo = this.add.text(4, 24, "", { 
            color: "#ff0000", 
            fontFamily: "'Courier Prime', monospace",
            fontStyle: "bold"
        });
        this.cameras.main.setBackgroundColor(VISUALS.BACKGROUND_COLOR);
        
        // Create selection rectangle (initially invisible)
        this.selectionRect = this.add.rectangle(0, 0, 0, 0, 0xffff00, 0.3);
        this.selectionRect.setStrokeStyle(2, 0xffff00);
        this.selectionRect.setVisible(false);
        this.selectionRect.setDepth(100); // Make sure it's above everything else
        
        // Set up mouse input for tile selection
        this.input.on('pointerdown', this.startTileSelection, this);
        this.input.on('pointermove', this.updateTileSelection, this);
        this.input.on('pointerup', this.endTileSelection, this);

        // connect with the room
        await this.connect();

        const $ = getStateCallbacks(this.room);

        $(this.room.state).players.onAdd((player, sessionId) => {
            // Assign a team based on player index (odd/even)
            const team = this.room.state.players.size % 2 === 0 ? 1 : 2;
            
            // Find a spawn position at a team station
            let spawnX = player.x;
            let spawnY = player.y;
            
            const station = this.getRandomStationForTeam(team);
            if (station) {
                spawnX = station.x;
                spawnY = station.y;
            }
            
            const entity = this.addPlayer(spawnX, spawnY, sessionId);
            entity.team = team;

            // is current player
            if (sessionId === this.room.sessionId) {
                this.currentPlayer = entity;

                this.localRef = this.add.rectangle(0, 0, entity.width, entity.height);
                this.localRef.setStrokeStyle(1, 0x00ff00);

                this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height);
                this.remoteRef.setStrokeStyle(1, 0xff0000);

                this.cameras.main.startFollow(entity);
                
                // Initialize the UI once we have the current player, with a slight delay to ensure the canvas is ready
                setTimeout(() => {
                    this.gameUI = new GameUI(this);
                }, 100);

                $(player).onChange(() => {
                    // this.remoteRef.x = player.x;
                    // this.remoteRef.y = player.y;
                    // We don't update the rotation of remoteRef since it's just a debug rectangle
                });

            } else {
                // listening for server updates
                $(player).onChange(() => {
                    //
                    // we're going to LERP the positions during the render loop.
                    //
                    entity.setData('serverX', player.x);
                    entity.setData('serverY', player.y);
                    entity.setData('serverRotation', player.rotation);
                });

            }

        });

        // remove local reference when entity is removed from the server
        $(this.room.state).players.onRemove((player, sessionId) => {
            this.removePlayer(sessionId);
        });
    }

    async connect() {
        // add connection status text
        const connectionStatusText = this.add
            .text(0, 0, "Trying to connect with the server...")
            .setStyle({ color: "#ff0000" })
            .setPadding(4)

        const client = new Client(BACKEND_URL);

        try {
            this.room = await client.joinOrCreate("game", {});

            // connection successful!
            connectionStatusText.destroy();
            console.log("Connected to server!");

        } catch (e) {
            // couldn't connect
            connectionStatusText.text =  "Could not connect with the server.";
        }

    }

    update(time: number, delta: number): void {
        // skip loop if not connected yet.
        if (!this.currentPlayer) { return; }

        this.elapsedTime += delta;
        while (this.elapsedTime >= this.fixedTimeStep) {
            this.elapsedTime -= this.fixedTimeStep;
            this.applyInput();
            this.fixedTick(time, this.fixedTimeStep);
        }
        
        // Process build queue
        this.updateBuildQueue(delta);

        // Update UI if it exists
        if (this.gameUI) {
            this.gameUI.update();
        }

        this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
        this.debugTileInfo.text = this.debugText;
    }
    
    // Update the build queue and process construction
    updateBuildQueue(delta: number): void {
        if (!this.buildQueue.length || !this.isBuilding || !this.currentPlayer) return;
        
        // Check if player is still in range of the build area
        const currentTile = this.buildQueue[0];
        const distance = Phaser.Math.Distance.Between(
            this.currentPlayer.x, this.currentPlayer.y,
            currentTile.worldX, currentTile.worldY
        );
        
        // If player moved too far away, cancel the build
        if (distance > this.MAX_BUILD_DISTANCE) {
            this.cancelBuild("Too far from build site! Construction canceled.");
            return;
        }
        
        // Update progress of the first tile in the queue
        currentTile.progress += delta;
        
        // Update visual indicator
        const progressRatio = Math.min(currentTile.progress / this.BUILD_TIME_PER_TILE, 1);
        currentTile.indicator.setFillStyle(0x00ff00, 0.7 * progressRatio);
        
        // If the tile is complete
        if (currentTile.progress >= this.BUILD_TIME_PER_TILE) {
            // Build the tile
            this.gameMap.setTile(currentTile.tile.x, currentTile.tile.y, 256, true);
            
            // Remove from queue and destroy the indicator
            currentTile.indicator.destroy();
            this.buildQueue.shift();
            
            // If we've completed all tiles, finish building
            if (this.buildQueue.length === 0) {
                this.isBuilding = false;
                if (this.gameUI) {
                    this.gameUI.showMessage("Road construction complete!");
                }
            }
        }
    }
    
    // Start tile selection process
    startTileSelection(pointer: Phaser.Input.Pointer) {
        // Convert pointer position to tile coordinates
        const tileXY = this.gameMap.groundLayer.worldToTileXY(pointer.worldX, pointer.worldY);
        
        this.selectionStartTile = { x: tileXY.x, y: tileXY.y };
        this.selectionEndTile = { x: tileXY.x, y: tileXY.y };
        
        // Set selection rectangle position and size
        this.updateSelectionRectangle();
        
        // Show the selection rectangle
        if (this.selectionRect) {
            this.selectionRect.setVisible(true);
        }
    }
    
    // Update tile selection as mouse moves
    updateTileSelection(pointer: Phaser.Input.Pointer) {
        if (!this.selectionStartTile || !pointer.isDown) return;
        
        // Convert pointer position to tile coordinates
        const tileXY = this.gameMap.groundLayer.worldToTileXY(pointer.worldX, pointer.worldY);
        this.selectionEndTile = { x: tileXY.x, y: tileXY.y };
        
        // Limit selection to 2x2 tiles
        if (Math.abs(this.selectionEndTile.x - this.selectionStartTile.x) > 1) {
            this.selectionEndTile.x = this.selectionStartTile.x + 
                (this.selectionEndTile.x > this.selectionStartTile.x ? 1 : -1);
        }
        
        if (Math.abs(this.selectionEndTile.y - this.selectionStartTile.y) > 1) {
            this.selectionEndTile.y = this.selectionStartTile.y + 
                (this.selectionEndTile.y > this.selectionStartTile.y ? 1 : -1);
        }
        
        // Update selection rectangle
        this.updateSelectionRectangle();
    }
    
    // End tile selection process
    endTileSelection(pointer: Phaser.Input.Pointer) {
        if (!this.selectionStartTile || !this.selectionEndTile) return;
        
        // Calculate the list of selected tiles
        this.selectedTiles = [];
        
        const startX = Math.min(this.selectionStartTile.x, this.selectionEndTile.x);
        const endX = Math.max(this.selectionStartTile.x, this.selectionEndTile.x);
        const startY = Math.min(this.selectionStartTile.y, this.selectionEndTile.y);
        const endY = Math.max(this.selectionStartTile.y, this.selectionEndTile.y);
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                this.selectedTiles.push({ x, y });
            }
        }
        
        // Keep selection rectangle visible to show the selected area
    }
    
    // Update the selection rectangle's position and size
    updateSelectionRectangle() {
        if (!this.selectionRect || !this.selectionStartTile || !this.selectionEndTile) return;
        
        const startX = Math.min(this.selectionStartTile.x, this.selectionEndTile.x);
        const endX = Math.max(this.selectionStartTile.x, this.selectionEndTile.x);
        const startY = Math.min(this.selectionStartTile.y, this.selectionEndTile.y);
        const endY = Math.max(this.selectionStartTile.y, this.selectionEndTile.y);
        
        // Convert tile coordinates to world coordinates
        const startPoint = this.gameMap.groundLayer.tileToWorldXY(startX, startY);
        const endPoint = this.gameMap.groundLayer.tileToWorldXY(endX + 1, endY + 1);
        
        // Set rectangle position to the center of the selected area
        const centerX = (startPoint.x + endPoint.x) / 2;
        const centerY = (startPoint.y + endPoint.y) / 2;
        
        // Set rectangle size
        const width = endPoint.x - startPoint.x;
        const height = endPoint.y - startPoint.y;
        
        this.selectionRect.setPosition(centerX, centerY);
        this.selectionRect.setSize(width, height);
    }
    
    // Function to start building road on selected tiles
    buildRoad() {
        // Check if already building or no tiles selected
        if (this.isBuilding || !this.selectedTiles.length || !this.currentPlayer) return;
        
        // Check if the selection is close enough to the player
        // Calculate the center of the selection
        let centerX = 0;
        let centerY = 0;
        
        for (const tile of this.selectedTiles) {
            const worldPos = this.gameMap.groundLayer.tileToWorldXY(tile.x, tile.y);
            centerX += worldPos.x;
            centerY += worldPos.y;
        }
        
        centerX /= this.selectedTiles.length;
        centerY /= this.selectedTiles.length;
        
        // Calculate distance from player to selection center
        const distance = Phaser.Math.Distance.Between(
            this.currentPlayer.x, this.currentPlayer.y,
            centerX, centerY
        );
        
        if (distance <= this.MAX_BUILD_DISTANCE) {
            // Initialize build queue
            this.buildQueue = [];
            this.isBuilding = true;
            
            // Add each selected tile to the build queue
            for (const tile of this.selectedTiles) {
                const worldPos = this.gameMap.groundLayer.tileToWorldXY(tile.x, tile.y);
                
                // Create a progress indicator for this tile
                const indicator = this.add.circle(
                    worldPos.x + 16, // Center of tile (assuming 32x32 tiles)
                    worldPos.y + 16, 
                    10, // Radius
                    0x00ff00, // Color
                    0.1 // Alpha (start almost transparent)
                );
                indicator.setDepth(110); // Ensure it's visible above other elements
                
                // Add to build queue
                this.buildQueue.push({
                    tile: tile,
                    progress: 0,
                    indicator: indicator,
                    worldX: worldPos.x + 16,
                    worldY: worldPos.y + 16
                });
            }
            
            // Message to show build started
            if (this.gameUI) {
                this.gameUI.showMessage("Road construction started!");
            }
            
            // Clear selection rectangle but keep selected tiles stored
            if (this.selectionRect) {
                this.selectionRect.setVisible(false);
            }
        } else {
            // Show message that player is too far
            if (this.gameUI) {
                this.gameUI.showMessage("Too far to build! Move closer to the selected area.");
            }
        }
    }
    
    // Cancel current build process
    cancelBuild(message: string = "Construction canceled.") {
        // Destroy all indicators
        for (const item of this.buildQueue) {
            item.indicator.destroy();
        }
        
        // Clear the queue
        this.buildQueue = [];
        this.isBuilding = false;
        
        // Show message
        if (this.gameUI) {
            this.gameUI.showMessage(message);
        }
    }
    
    // Clear the current selection
    clearSelection() {
        this.selectedTiles = [];
        this.selectionStartTile = null;
        this.selectionEndTile = null;
        
        if (this.selectionRect) {
            this.selectionRect.setVisible(false);
        }
    }

    applyInput() {
        this.currentTick++;

        // const currentPlayerRemote = this.room.state.players.get(this.room.sessionId);
        // const ticksBehind = this.currentTick - currentPlayerRemote.tick;
        // console.log({ ticksBehind });

        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;
        this.inputPayload.fire = this.spaceKey.isDown;
        this.inputPayload.tick = this.currentTick;
        this.room.send(0, this.inputPayload);

        if (this.currentPlayer.active) {
            this.currentPlayer.currentInput = this.inputPayload;
        }
        
        // Update debug references
        // this.localRef.x = this.currentPlayer.x;
        // this.localRef.y = this.currentPlayer.y;

        // Apply interpolation to other players
        for (let sessionId in this.playerEntities) {
            // Skip the current player
            if (sessionId === this.room.sessionId) {
                continue;
            }

            const entity = this.playerEntities[sessionId];
            const { serverX, serverY, serverRotation } = entity.data.values;

            // if (serverX !== undefined && serverY !== undefined) {
            //     // Smoothly interpolate position for Matter physics
            //     const currentPos = new Phaser.Math.Vector2(entity.x, entity.y);
            //     const targetPos = new Phaser.Math.Vector2(serverX, serverY);
                
            //     // Linear interpolation
            //     currentPos.lerp(targetPos, 0.2);
                
            //     // Update position
            //     entity.x = currentPos.x;
            //     entity.y = currentPos.y;
                
            //     if (serverRotation !== undefined) {
            //         entity.setRotation(serverRotation);
            //     }
            // }
        }
    }

}
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
import { ClientTank } from "../entities/ClientTank";
import { GameUI } from "../UI";
import { VISUALS, TEAM_COLORS, PHYSICS } from "../../../shared/constants";
import { ClientMap } from "./ClientMap";
import { ClientStation } from "../entities/ClientStation";
import { ClientPillbox } from "../entities/ClientPillbox";
import { ClientBullet } from "../entities/ClientBullet";
import { Bullet } from "../../../shared/entities/Bullet";

// import @geckos.io/snapshot-interpolation
import { SnapshotInterpolation, Snapshot, Vault } from '@geckos.io/snapshot-interpolation'
import { off } from "process";

// initialize the library (add your server's fps)
const SI = new SnapshotInterpolation(60)

// Define the newswire message type
export interface NewswireMessage {
  type: 'player_join' | 'player_leave' | 'station_capture' | 'pillbox_placed' | 'pillbox_destroyed' | 'chat';
  playerId?: string;
  playerName?: string;
  team?: number;
  position?: { x: number, y: number };
  message: string;
  isTeamChat?: boolean;
}

export class ClientGameScene extends GameScene {
    room: Room<MyRoomState>;

    // Map of players by session ID
    clientBullets: Map<string, ClientBullet> = new Map();
    players: Map<string, ClientTank> = new Map();
    currentPlayer: ClientTank;

    playerVault = new Vault()
    lastReconciliationTime = 0
    
    // UI instance
    gameUI: GameUI;

    debugFPS: Phaser.GameObjects.Text;
    debugTileInfo: Phaser.GameObjects.Text;
    debugPrediction: Phaser.GameObjects.Text;

    localRef: Phaser.GameObjects.Rectangle;
    remoteRef: Phaser.GameObjects.Rectangle;

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    
    // WASD keys
    keyW: Phaser.Input.Keyboard.Key;
    keyA: Phaser.Input.Keyboard.Key;
    keyS: Phaser.Input.Keyboard.Key;
    keyD: Phaser.Input.Keyboard.Key;
    
    // Virtual inputs from touch controls
    virtualInputs: { targetHeading: number; up: boolean; down: boolean } = {
      targetHeading: 0,
      up: false,
      down: false
    };
    virtualFiring: boolean = false;
    
    // Tile selection properties
    selectionStartTile: { x: number, y: number } | null = null;
    selectionEndTile: { x: number, y: number } | null = null;
    selectionRect: Phaser.GameObjects.Rectangle | null = null;
    selectedTiles: { x: number, y: number }[] = [];
    
    // Tile building properties
    buildQueue: { 
        tile: { x: number, y: number }, 
        progress: number, 
        indicator: Phaser.GameObjects.Line,
        worldX: number,
        worldY: number,
        tileType?: string // Add type of tile being built
    }[] = [];
    isBuilding: boolean = false;
    // Use constants from shared constants.ts for consistency
    BUILD_TIME_PER_TILE: number = PHYSICS.BUILD_TIME_PER_TILE;
    MAX_BUILD_DISTANCE: number = PHYSICS.BUILD_MAX_DISTANCE;

    inputPayload: InputData = {
        targetHeading: 0,
        up: false,
        fire: false,
        tick: 0,
    };

    playerName: string = "Player";
  
  async create() {
        console.log("ClientGameScene create");
        
        await super.create();

        this.cursorKeys = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Initialize WASD keys
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        
        // Prevent game inputs while chat is active by capturing key events
        this.input.keyboard.on('keydown', (event) => {
            // Skip input capturing if gameUI isn't initialized yet
            if (!this.gameUI) return;
            
            // If chat is active, stop event propagation for WASD and arrow keys
            if (this.gameUI.isChatActive) {
                // Allow only Escape and Enter to pass through for chat controls
                if (event.key !== 'Escape' && event.key !== 'Enter') {
                    event.stopPropagation();
                }
            }
        });
        
        // Check if debug mode is enabled via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug') === 'true';
        
        // Create debug text elements
        this.debugFPS = this.add.text(4, 4, "", { 
            color: "#ff0000", 
            fontFamily: "'Courier Prime', monospace",
            fontStyle: "bold"
        });
        this.debugFPS.setDepth(1000);
        this.debugFPS.setScrollFactor(0); // Fix it to the camera
        this.debugFPS.setVisible(debugMode);
        
        this.debugTileInfo = this.add.text(4, 24, "", { 
            color: "#ff0000", 
            fontFamily: "'Courier Prime', monospace",
            fontStyle: "bold"
        });
        this.debugTileInfo.setDepth(1000);
        this.debugTileInfo.setScrollFactor(0); // Fix it to the camera
        this.debugTileInfo.setVisible(debugMode);
        
        this.debugPrediction = this.add.text(4, 44, "Debug prediction info", { 
            color: "#ff0000", 
            fontFamily: "'Courier Prime', monospace",
            fontStyle: "bold"
        });
        this.debugPrediction.setDepth(1000);
        this.debugPrediction.setScrollFactor(0); // Fix it to the camera
        this.debugPrediction.setVisible(debugMode);
        this.cameras.main.setBackgroundColor(VISUALS.WATER_COLOR);
        
        // Create selection rectangle (initially invisible)
        this.selectionRect = this.add.rectangle(0, 0, 0, 0, 0xffff00, 0.3);
        this.selectionRect.setStrokeStyle(2, 0xffff00);
        this.selectionRect.setVisible(false);
        this.selectionRect.setDepth(100); // Make sure it's above everything else
        this.selectionRect.setOrigin(0, 0); // Set origin to top-left for easier positioning
        
        // Set up mouse input for tile selection
        this.input.on('pointerdown', this.startTileSelection, this);
        this.input.on('pointermove', this.updateTileSelection, this);
        this.input.on('pointerup', this.endTileSelection, this);

        // connect with the room
        await this.connect();

        const $ = getStateCallbacks(this.room);
        
        $(this.room.state).listen("map", (currentValue, previousValue) => {
            console.log("Map added:", currentValue);
            // Use ClientMap to create the tilemap from the schema
            this.gameMap = new ClientMap(this);
            (this.gameMap as ClientMap).createTilemapFromSchema(currentValue);
        });
        
        // Handle stations
        $(this.room.state).stations.onAdd((stationSchema, stationId) => {
            console.log(`Station added: ${stationId} at (${stationSchema.x}, ${stationSchema.y}), team: ${stationSchema.team}`);
            
            // Create a client station at the given position
            const station = new ClientStation(this, stationSchema.x, stationSchema.y, stationSchema.team);
            this.stations.push(station);
            
            // Initial update from server schema
            station.updateFromServer(stationSchema);
            
            // Listen for changes to this station
            $(stationSchema).onChange(() => {
                station.updateFromServer(stationSchema);
            });
        });
        
        // Handle pillboxes
        $(this.room.state).pillboxes.onAdd((pillboxSchema, pillboxId) => {
            console.log(`Pillbox added: ${pillboxId} at (${pillboxSchema.x}, ${pillboxSchema.y}), team: ${pillboxSchema.team}, health: ${pillboxSchema.health}, state: ${pillboxSchema.state}`);
            
            // Don't create a visual pillbox for "held" state
            if (pillboxSchema.state === "held") {
                console.log(`Skipping visual creation for held pillbox ${pillboxId}`);
                return;
            }
            
            // Create a client pillbox at the given position
            const pillbox = new ClientPillbox(this, pillboxSchema.x, pillboxSchema.y, pillboxSchema.team);
            pillbox.schemaId = pillboxId;
            this.pillboxes.push(pillbox);
            
            // Initial update from server schema
            pillbox.updateFromServer(pillboxSchema);
            
            // Listen for changes to this pillbox
            $(pillboxSchema).onChange(() => {
                // If state changes to "held", remove the pillbox from the scene
                if (pillboxSchema.state === "held" && pillbox.state !== "held") {
                    console.log(`Pillbox ${pillboxId} became held, removing from scene`);
                    
                    // Find and remove from pillboxes array
                    const pillboxIndex = this.pillboxes.indexOf(pillbox);
                    if (pillboxIndex !== -1) {
                        this.pillboxes.splice(pillboxIndex, 1);
                    }
                    
                    // Destroy the Phaser object
                    pillbox.destroy();
                    return;
                }
                
                // For other state changes, update normally
                pillbox.updateFromServer(pillboxSchema);
            });
        });
        
        // Handle pillbox removal
        $(this.room.state).pillboxes.onRemove((pillboxSchema, pillboxId) => {
            console.log(`Pillbox removed: ${pillboxId}`);
            
            // Find and remove the pillbox
            const pillbox = this.pillboxes.find(p => p.schemaId === pillboxId);
            if (pillbox) {
                // Remove from array
                const pillboxIndex = this.pillboxes.indexOf(pillbox);
                if (pillboxIndex !== -1) {
                    this.pillboxes.splice(pillboxIndex, 1);
                }
                
                // Destroy the Phaser object
                pillbox.destroy();
            }
        });

        $(this.room.state).players.onAdd((player, sessionId) => {
            console.log("Player added:", player);
            
            // Use the position and team sent from the server
            const spawnX = player.tank.x;
            const spawnY = player.tank.y;
            const team = player.tank.team;
            
            console.log(`Creating player at server position: ${spawnX}, ${spawnY}, team: ${team}`);
            
            // Create the tank at the server-provided position
            const entity = this.addPlayer(spawnX, spawnY, sessionId, team, sessionId === this.room.sessionId);
            entity.team = team;

            // is current player
            if (sessionId === this.room.sessionId) {
                this.currentPlayer = entity;

                this.localRef = this.add.rectangle(0, 0, entity.width, entity.height);
                this.localRef.setStrokeStyle(1, 0x00ff00);

                this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height);
                this.remoteRef.setStrokeStyle(1, 0xff0000);

                entity.setDepth(200);
                this.cameras.main.startFollow(entity);
                
                // Initialize the UI once we have the current player, with a slight delay to ensure the canvas is ready
                setTimeout(() => {
                    this.gameUI = new GameUI(this);
                    
                    // Show welcome modal after UI is initialized
                    setTimeout(() => {
                        this.gameUI.showWelcomeModal();
                    }, 500);
                }, 100);

                // Listen for changes on the tank schema directly
                $(player.tank).onChange(() => {
                    //console.log("Current player tank state changed:", player.tank);
                    
                    // Update client's position based on server state
                    this.currentPlayer.updateFromServer(player.tank);
                    
                    // Update debug rectangle position
                    this.remoteRef.x = player.tank.x;
                    this.remoteRef.y = player.tank.y;
                });

            } else {
                // listening for server updates
                // Listen for changes on the tank schema directly
                $(player.tank).onChange(() => {
                    //console.log("Other player tank state changed:", player.tank);
                    
                    // Update entity based on the changed tank data
                    //entity.updateFromServer(player.tank);
                });

            }

        });

        // remove local reference when entity is removed from the server
        $(this.room.state).players.onRemove((player, sessionId) => {
            this.removePlayer(sessionId);
        });
        
        // Handle bullets
        $(this.room.state).bullets.onAdd((bulletSchema, bulletId) => {
            // Create a client bullet based on the schema
            const bullet = new ClientBullet(
                this, 
                bulletSchema.x, 
                bulletSchema.y, 
                bulletSchema.rotation
            );
            
            // Add to our local bullets map
            this.clientBullets.set(bulletId, bullet);
        });
        
        // Handle bullet removal
        $(this.room.state).bullets.onRemove((bulletSchema, bulletId) => {
            // Destroy the bullet if it exists
            if (this.clientBullets.has(bulletId)) {
                const bullet = this.clientBullets.get(bulletId);
                bullet.destroy();
                this.clientBullets.delete(bulletId);
            }
        });
    }
        
    

    promptForPlayerName() {
        return new Promise<void>(resolve => {
            // Create a modal dialog for name input
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '1000';
            
            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = '#333';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '5px';
            modalContent.style.textAlign = 'center';
            
            const title = document.createElement('h2');
            title.textContent = 'Enter Your Name';
            title.style.color = '#fff';
            title.style.marginBottom = '20px';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Your Name';
            input.value = this.playerName;
            input.style.padding = '8px';
            input.style.fontSize = '16px';
            input.style.width = '100%';
            input.style.marginBottom = '20px';
            input.style.borderRadius = '3px';
            input.style.border = 'none';
            
            const button = document.createElement('button');
            button.textContent = 'Join Game';
            button.style.padding = '8px 16px';
            button.style.fontSize = '16px';
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '3px';
            button.style.cursor = 'pointer';
            
            modalContent.appendChild(title);
            modalContent.appendChild(input);
            modalContent.appendChild(button);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Focus the input field
            input.focus();
            
            const submitName = () => {
                this.playerName = input.value || "Player";
                document.body.removeChild(modal);
                resolve();
            };
            
            // Handle enter key press
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    submitName();
                }
            });
            
            // Handle button click
            button.addEventListener('click', () => {
                submitName();
            });
        });
    }
    
    async connect() {
        // Prompt for player name first
        await this.promptForPlayerName();
        
        // add connection status text
        const connectionStatusText = this.add
            .text(0, 0, `Trying to connect to ${BACKEND_URL}`)
            .setStyle({ color: "#ff0000" })
            .setPadding(4)

        const client = new Client(BACKEND_URL);

        try {
            this.room = await client.joinOrCreate("game", { playerName: this.playerName });

            // connection successful!
            connectionStatusText.destroy();
            console.log("Connected to server with name: " + this.playerName);
            
            // Listen for notification messages
            this.room.onMessage("notification", (data) => {
                if (this.gameUI && data.message) {
                    // Use the provided duration or default to 2000ms
                    const duration = data.duration || 2000;
                    this.gameUI.showMessage(data.message, duration);
                }
            });
            
            // Listen for response from server on pillbox placement
            this.room.onMessage("pillboxPlaced", (response) => {
                if (response.success) {
                    if (this.gameUI) {
                        this.gameUI.showMessage("Pillbox placed successfully.");
                    }
                    this.clearSelection();
                } else {
                    if (this.gameUI) {
                        // Display the reason for failure if provided
                        const message = response.reason ? response.reason : "Failed to place pillbox.";
                        this.gameUI.showMessage(message);
                    }
                }
            });
            
            // Listen for response from server on tile building
            this.room.onMessage("tileBuildStarted", (response) => {
                if (response.success) {
                    this.isBuilding = true;
                    this.buildQueue = [];
                    
                    // Add visual indicators for each tile in the build queue
                    for (const tile of response.tiles) {
                        const worldPos = this.gameMap.groundLayer.tileToWorldXY(tile.x, tile.y);
                        
                        // Create a progress indicator for this tile
                        const indicator = this.add.line(
                            worldPos.x + 8, // Center of tile (assuming 32x32 tiles)
                            worldPos.y + 8, 
                            0, 0,
                            8, 8,
                            0xffffff, // Color
                            1.0
                        );
                        indicator.setDepth(110); // Ensure it's visible above other elements
                        
                        // Add to build queue
                        this.buildQueue.push({
                            tile: tile,
                            tileType: response.tileType,
                            progress: 0,
                            indicator: indicator,
                            worldX: worldPos.x + 16,
                            worldY: worldPos.y + 16
                        });
                    }
                    
                    if (this.gameUI) {
                        const tileType = response.tileType || 'tile';
                        this.gameUI.showMessage(`${tileType.charAt(0).toUpperCase() + tileType.slice(1)} construction started.`);
                    }
                    this.clearSelection();
                } else {
                    if (this.gameUI) {
                        const message = response.reason ? response.reason : "Failed to start construction.";
                        this.gameUI.showMessage(message);
                    }
                }
            });
            
            // Listen for tile build progress updates
            this.room.onMessage("tileBuildProgress", (data) => {
                // Find the corresponding tile in our queue
                const queueItem = this.buildQueue.find(item => 
                    item.tile.x === data.tile.x && item.tile.y === data.tile.y);
                    
                if (queueItem) {
                    // Update progress percentage
                    queueItem.progress = this.BUILD_TIME_PER_TILE * data.progress;
                }
            });
            
            // Also listen for the old message name for backward compatibility
            this.room.onMessage("roadBuildProgress", (data) => {
                // Find the corresponding tile in our queue
                const queueItem = this.buildQueue.find(item => 
                    item.tile.x === data.tile.x && item.tile.y === data.tile.y);
                    
                if (queueItem) {
                    // Update progress percentage
                    queueItem.progress = this.BUILD_TIME_PER_TILE * data.progress;
                }
            });
            
            // Listen for tile build completion
            this.room.onMessage("tileBuildComplete", (data) => {
                // Find and remove the tile from our queue
                const index = this.buildQueue.findIndex(item => 
                    item.tile.x === data.tile.x && item.tile.y === data.tile.y);
                    
                if (index !== -1) {
                    // Remove the indicator
                    this.buildQueue[index].indicator.destroy();
                    // Store the tile type before removing from queue
                    const tileType = this.buildQueue[index].tileType;
                    this.buildQueue.splice(index, 1);
                    
                    // If queue is empty, building is complete
                    if (this.buildQueue.length === 0) {
                        this.isBuilding = false;
                        if (this.gameUI) {
                            // Handle wood harvesting specific message
                            if (data.isHarvesting) {
                                this.gameUI.showMessage(`Harvested 1 wood from forest.`);
                                this.gameUI.addNewswireMessage(`Player collected wood from the forest`, 'success');
                            } else {
                                const displayTileType = data.tileType || tileType || 'Tile';
                                this.gameUI.showMessage(`${displayTileType.charAt(0).toUpperCase() + displayTileType.slice(1)} construction complete.`);
                            }
                        }
                    }
                }
            });
            
            // Also listen for the old message name for backward compatibility
            this.room.onMessage("roadBuildComplete", (data) => {
                // Find and remove the tile from our queue
                const index = this.buildQueue.findIndex(item => 
                    item.tile.x === data.tile.x && item.tile.y === data.tile.y);
                    
                if (index !== -1) {
                    // Remove the indicator
                    this.buildQueue[index].indicator.destroy();
                    this.buildQueue.splice(index, 1);
                    
                    // If queue is empty, building is complete
                    if (this.buildQueue.length === 0) {
                        this.isBuilding = false;
                        if (this.gameUI) {
                            this.gameUI.showMessage("Road construction complete.");
                        }
                    }
                }
            });
            
            // Listen for direct tile change messages from server
            this.room.onMessage("tileChanged", (data) => {
                if (this.gameMap && this.gameMap.map) {
                    // Update the tile directly in the client map
                    this.gameMap.setTile(data.x, data.y, data.tileIndex, data.applyWang);
                }
            });
            
            // Listen for newswire messages from server
            this.room.onMessage("newswire", (message: NewswireMessage) => {
                if (this.gameUI) {
                    // Handle chat messages differently
                    if (message.type === 'chat') {
                        // Use the player name from the message if available
                        let playerName = message.playerName || 'Unknown';
                        
                        // Fallback to looking up the player if not in the message
                        if (!playerName && message.playerId) {
                            const player = this.players.get(message.playerId);
                            if (player) {
                                playerName = player.name;
                            }
                        }
                        
                        // Add chat message to newswire
                        this.gameUI.addChatMessage(
                            message.message,
                            playerName,
                            message.isTeamChat || false,
                            message.team || 0
                        );
                    } else {
                        // Process other newswire messages as before
                        let messageType: 'info' | 'warning' | 'error' | 'success' = 'info';
                        
                        switch(message.type) {
                            case 'station_capture':
                                messageType = 'success';
                                break;
                            case 'pillbox_destroyed':
                                messageType = 'warning';
                                break;
                            case 'player_join':
                                messageType = 'info';
                                break;
                            case 'player_leave':
                                messageType = 'info';
                                break;
                            case 'player_destroyed':
                                messageType = 'error';
                                break;
                            case 'pillbox_placed':
                                messageType = 'success';
                                break;
                            case 'game_win':
                                messageType = 'success';
                                // Show a big win message with the game UI
                                this.gameUI.showMessage(message.message, 10000, 'success');
                                break;
                            case 'info':
                                messageType = 'info';
                                break;
                        }
                        
                        this.gameUI.addNewswireMessage(message.message, messageType);
                    }
                }
            });

            this.room.onMessage("snapshot", (snapshot: any) => {
                SI.snapshot.add(snapshot);
            });
            
            // Add initial server connection message as popup
            setTimeout(() => {
                this.gameUI.showMessage("Connected to server successfully!", 3000);
            }, 2000);

        } catch (e) {
            // couldn't connect
            connectionStatusText.text =  "Could not connect with the server.";
        }

    }

    // This is only done for non-player tanks
    doInterpolation() {        
        const snapshot = SI.calcInterpolation('x y speed heading(rad) ', 'players');
        if(!snapshot) return;
        const playerStates = snapshot.state;

        for (const player of playerStates) {
            if (player.id === this.currentPlayer.sessionId) {
                continue;
            }
            const tank = this.players.get(player.id);
            if (tank) {
                tank.updateFromServer(player);
            }
        }
    }


    serverReconciliation() {
        if(this.currentPlayer) {
            this.playerVault.add(SI.snapshot.create([ this.currentPlayer.getState()]))
            const serverSnapshot = SI.vault.get()
            if(serverSnapshot && serverSnapshot.time > this.lastReconciliationTime) {
                const playerSnapshot = this.playerVault.get(serverSnapshot.time, true)
                if(playerSnapshot) {
                    this.lastReconciliationTime = serverSnapshot.time;
                    const playerState = playerSnapshot.state[0];
                    const serverState = serverSnapshot.state.players.filter(s => s.id === this.currentPlayer.sessionId)[0]

                    const offsetX = playerState.x - serverState.x;
                    const offsetY = playerState.y - serverState.y;
                    let offsetHeading = playerState.heading - serverState.heading;                    
                    while (offsetHeading > Math.PI) offsetHeading -= Math.PI * 2;
                    while (offsetHeading < -Math.PI) offsetHeading += Math.PI * 2;
                    const offsetSpeed = playerState.speed - serverState.speed;
                    
                    const correctionAmt = 0.2;
                    this.currentPlayer.x -= offsetX * correctionAmt;
                    this.currentPlayer.y -= offsetY * correctionAmt;
                    this.currentPlayer.heading -= offsetHeading * correctionAmt;
                    this.currentPlayer.speed -= offsetSpeed * correctionAmt;
                }
            }
            
        }
    }
    
    applyInput() {
        this.currentTick++;

        // Check if chat is active - skip inputs if chat is capturing keyboard
        const isChatActive = this.gameUI && this.gameUI.isChatActive;
        if (isChatActive) {
            // Clear inputs when chat is active
            this.inputPayload.targetHeading = 0;
            this.inputPayload.up = false;
            this.inputPayload.down = false;
            this.inputPayload.fire = false;
        } else {
            // Handle keyboard input for turning
            let targetHeading = 0;
            
            // Convert left/right keys or A/D keys to special values for targetHeading
            if (this.cursorKeys.left.isDown || this.keyA.isDown) {
                targetHeading = -Infinity; // Special value for turning left with keyboard
            } else if (this.cursorKeys.right.isDown || this.keyD.isDown) {
                targetHeading = Infinity; // Special value for turning right with keyboard
            } else {
                // Use joystick targetHeading if available
                targetHeading = this.virtualInputs.targetHeading;
            }
            
            this.inputPayload.targetHeading = targetHeading;
            this.inputPayload.up = this.cursorKeys.up.isDown || this.keyW.isDown || this.virtualInputs.up;
            this.inputPayload.down = this.cursorKeys.down.isDown || this.keyS.isDown || this.virtualInputs.down;
            this.inputPayload.fire = this.spaceKey.isDown || this.virtualFiring;
        }
        
        this.inputPayload.tick = this.currentTick;
        
        // Send input to server with the correct message type (0) to match server handler
        this.room.send("input", this.inputPayload);

        // Apply input to current player for client-side prediction
        if (this.currentPlayer && this.currentPlayer.active) {
            // Use sendInput to properly handle input buffering and prediction
            this.currentPlayer.sendInput({...this.inputPayload});
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

        this.serverReconciliation();
        this.doInterpolation();
        
        // Process build queue
        this.updateBuildQueue(delta);

        if (this.selectedTiles.length && this.getSelectionDistance() >= this.MAX_BUILD_DISTANCE * 2) {
            this.clearSelection();
        } 

        // Update UI if it exists
        if (this.gameUI) {
            this.gameUI.update();
        }

        // Update debug information only if debug elements are visible
        if (this.debugFPS.visible) {
            this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
            this.debugTileInfo.text = this.debugText;
            
            // Show prediction debug info
            if (this.currentPlayer) {
                const pendingInputCount = this.currentPlayer.pendingInputs.length;
                const serverLastTick = this.currentPlayer.lastServerState.tick;
                const clientCurrentTick = this.currentTick;
                const tickDiff = clientCurrentTick - serverLastTick;
                
                this.debugPrediction.text = `Prediction: ${pendingInputCount} pending, Tick diff: ${tickDiff}`;
            }
        }
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
            this.cancelBuild("Too far from build site. Construction canceled.");
            return;
        }
        
        // Update progress of the first tile in the queue
        currentTile.progress += delta;
        
        // Update visual indicator
        const progressRatio = Math.min(currentTile.progress / this.BUILD_TIME_PER_TILE, 1);
        currentTile.indicator.rotation = progressRatio * Math.PI * 2;
        
        // If the tile is complete
        if (currentTile.progress >= this.BUILD_TIME_PER_TILE) {
            // Remove from queue and destroy the indicator
            currentTile.indicator.destroy();
            this.buildQueue.shift();
            
            // If we've completed all tiles, finish building
            if (this.buildQueue.length === 0) {
                this.isBuilding = false;
                if (this.gameUI) {
                    // Different message based on what was built
                    if (currentTile.tileType === 'forest') {
                        this.gameUI.showMessage("Wood harvesting complete.");
                    } else {
                        this.gameUI.showMessage(`${currentTile.tileType.charAt(0).toUpperCase() + currentTile.tileType.slice(1)} construction complete.`);
                    }
                }
            }
        }
    }
    
    // Start tile selection process - simplified to always select 2x2
    startTileSelection(pointer: Phaser.Input.Pointer) {
        // Convert pointer position to tile coordinates
        let tilePos = this.gameMap.groundLayer.worldToTileXY(pointer.worldX, pointer.worldY);
        
        // Get the top-left corner of a 2x2 area centered at cursor
        const startX = tilePos.x - (tilePos.x % 2);
        const startY = tilePos.y - (tilePos.y % 2);
        
        // Set selection to be exactly 2x2
        this.selectionStartTile = { x: startX, y: startY };
        this.selectionEndTile = { x: startX + 1, y: startY + 1 };
        
        // Set selection rectangle position and size
        this.updateSelectionRectangle();
        
        // Show the selection rectangle
        if (this.selectionRect) {
            this.selectionRect.setVisible(true);
        }
        
        // Immediately set the selectedTiles array with the 2x2 block
        this.selectedTiles = [
            { x: startX, y: startY },
            { x: startX + 1, y: startY },
            { x: startX, y: startY + 1 },
            { x: startX + 1, y: startY + 1 }
        ];
    }
    
    // Update tile selection as mouse moves
    updateTileSelection(pointer: Phaser.Input.Pointer) {
        if (!pointer.isDown) return;
        
        // Convert pointer position to tile coordinates
        let tilePos = this.gameMap.groundLayer.worldToTileXY(pointer.worldX, pointer.worldY);
        
        // Get the top-left corner of a 2x2 area centered at cursor
        const startX = tilePos.x - (tilePos.x % 2);
        const startY = tilePos.y - (tilePos.y % 2);
        
        // Set selection to be exactly 2x2
        this.selectionStartTile = { x: startX, y: startY };
        this.selectionEndTile = { x: startX + 1, y: startY + 1 };
        
        // Update selection rectangle
        this.updateSelectionRectangle();
        
        // Update selectedTiles array with the 2x2 block
        this.selectedTiles = [
            { x: startX, y: startY },
            { x: startX + 1, y: startY },
            { x: startX, y: startY + 1 },
            { x: startX + 1, y: startY + 1 }
        ];
    }
    
    // End tile selection process
    endTileSelection(pointer: Phaser.Input.Pointer) {
        // If the user clicks somewhere without dragging, we want to toggle selection off
        // This allows clicking elsewhere to clear the selection
        if (pointer.downTime === pointer.upTime && !this.isBuilding) {
            this.clearSelection();
        }
        if (this.selectedTiles.length && this.getSelectionDistance() >= this.MAX_BUILD_DISTANCE*2) {
            this.clearSelection();
        } 
        // Otherwise, keep the currently selected tiles
    }
    
    // Update the selection rectangle's position and size
    updateSelectionRectangle() {
        if (!this.selectionRect || !this.selectionStartTile || !this.selectionEndTile) return;
        
        // Convert tile coordinates to world coordinates
        const startPoint = this.gameMap.groundLayer.tileToWorldXY(
            this.selectionStartTile.x, 
            this.selectionStartTile.y
        );
        
        // For a 2x2 grid, the end point is 2 tiles to the right and down
        const endPoint = this.gameMap.groundLayer.tileToWorldXY(
            this.selectionStartTile.x + 2,
            this.selectionStartTile.y + 2
        );
        
        // Set rectangle size and position (using top-left origin)
        const width = endPoint.x - startPoint.x;
        const height = endPoint.y - startPoint.y;
        
        // Position is top-left point since origin is (0,0)
        this.selectionRect.setPosition(startPoint.x, startPoint.y);
        this.selectionRect.setSize(width, height);
    }

    getSelectionDistance(): number {
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
        return distance;
    }
    
    // Function to start building tile on selected tiles
    buildTile(tileType: string = 'road') {
        // Check if already building or no tiles selected
        if (this.isBuilding || !this.selectedTiles.length || !this.currentPlayer) return;

        console.log(`Starting tile construction for ${this.currentPlayer.sessionId} - ${tileType}`);
        
        const distance = this.getSelectionDistance();
        
        if (distance <= this.MAX_BUILD_DISTANCE) {
            // Send buildTile request to server with selected tiles and tile type
            this.room.send("buildTile", { 
                tiles: this.selectedTiles,
                tileType: tileType
            });
            
            // Show message to user based on tile type
            if (this.gameUI) {
                if (tileType === 'forest') {
                    this.gameUI.showMessage(`Wood harvesting request sent to server...`);
                } else {
                    this.gameUI.showMessage(`${tileType.charAt(0).toUpperCase() + tileType.slice(1)} construction request sent to server...`);
                }
            }
            
            // Clear selection rectangle but keep selected tiles stored
            if (this.selectionRect) {
                this.selectionRect.setVisible(false);
            }
        } else {
            // Show message that player is too far
            if (this.gameUI) {
                this.gameUI.showMessage("Too far to build. Move closer to the selected area.");
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
    
    // Method to place a pillbox at the selected location
    placePillbox() {
        // Check if we have a selection and if the player has pillboxes
        if (!this.selectedTiles.length || !this.currentPlayer || this.currentPlayer.pillboxCount <= 0) {
            if (this.gameUI) {
                this.gameUI.showMessage("No tiles selected or no pillboxes available.");
            }
            return;
        }
        
        // Check if the selection is valid for a pillbox (must be exactly 2x2)
        const isValid = (this.gameMap as any).isSelectionValidForPillbox(this.selectedTiles);
        if (!isValid) {
            if (this.gameUI) {
                this.gameUI.showMessage("Invalid selection. Pillbox requires a 2x2 area of valid land tiles.");
            }
            return;
        }
        
        // Find the top-left tile of the selection to use as the anchor point
        const minX = Math.min(...this.selectedTiles.map(t => t.x));
        const minY = Math.min(...this.selectedTiles.map(t => t.y));
        
        // Convert tile coordinates to world coordinates for distance calculation
        const worldPos = this.gameMap.groundLayer.tileToWorldXY(minX, minY);
        // Use center of 2x2 area for distance calculation
        const centerX = worldPos.x + 16; 
        const centerY = worldPos.y + 16;
        
        // Calculate distance from player to selection
        const distance = Phaser.Math.Distance.Between(
            this.currentPlayer.x, this.currentPlayer.y,
            centerX, centerY
        );
        
        // Check if player is close enough
        if (distance <= PHYSICS.BUILD_MAX_DISTANCE) { // Using the same distance as for building roads
            // Send placement request to server with the top-left tile coordinates
            this.room.send("placePillbox", { 
                x: centerX, 
                y: centerY, 
                tileX: minX, 
                tileY: minY 
            });
        } else {
            // Show message that player is too far
            if (this.gameUI) {
                this.gameUI.showMessage("Too far to place pillbox. Move closer to the selected area.");
            }
        }
    }

    // Add a player entity to the scene
    addPlayer(x: number, y: number, sessionId: string, team: number, isLocalPlayer: boolean = false): ClientTank {
        // Get player name from schema if available, otherwise use the playerName property for local player
        const player = this.room.state.players.get(sessionId);
        const playerName = player?.tank?.name || (isLocalPlayer ? this.playerName : "Player");
        
        console.log(`Adding ${isLocalPlayer ? "local" : "remote"} player ${sessionId} with name ${playerName} at (${x}, ${y})`);
        const tank = new ClientTank(this, x, y, sessionId, isLocalPlayer, playerName, team);
        this.players.set(sessionId, tank);
        return tank;
    }

    // Remove a player entity from the scene
    removePlayer(sessionId: string): void {
        const tank = this.players.get(sessionId);
        if (tank) {
            console.log(`Removing player ${sessionId}`);
            tank.destroy();
            this.players.delete(sessionId);
        }
    }

    override handleWallBulletCollision(bullet: Bullet, wall: MatterJS.Body) {
        bullet.destroy();
    }
}
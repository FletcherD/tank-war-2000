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
import { GameScene, InputData, Tank } from "./Game";
import { GameUI } from "../UI";

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
        this.cameras.main.setBackgroundColor(0x007d3e);

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
                    this.remoteRef.x = player.x;
                    this.remoteRef.y = player.y;
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

        // Update UI if it exists
        if (this.gameUI) {
            this.gameUI.update();
        }

        this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
        this.debugTileInfo.text = this.debugText;
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
        this.localRef.x = this.currentPlayer.x;
        this.localRef.y = this.currentPlayer.y;

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
            //     entity.setPosition(currentPos.x, currentPos.y);
                
            //     if (serverRotation !== undefined) {
            //         entity.setRotation(serverRotation);
            //     }
            // }
        }
    }

}
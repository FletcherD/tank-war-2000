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

export class GameScene extends Phaser.Scene {
    playerEntities: { [sessionId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody } = {};

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    currentTick: number = 0;

    constructor() {
        super({ key: "game" });
    }

    addPlayer(x: number, y: number, sessionId: string)  {
      const entity = this.physics.add.image(x, y, 'tank');
      entity.setCircle(16);
      this.playerEntities[sessionId] = entity;
    }

    removePlayer(sessionId: string) {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId]
      }
    }

    async create() {
        this.physics.world.setBoundsCollision(true, true, true, true);
        this.physics.enableUpdate();
        this.physics.world.defaults.debugShowBody = true;

        const wall = this.physics.add.staticImage(100,100, 'wall');

        // this.cameras.main.startFollow(this.ship, true, 0.2, 0.2);
        // this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, 800, 600);
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
            this.fixedTick(time, this.fixedTimeStep);
        }

        this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
    }

    fixedTick(time, delta) {
        this.currentTick++;

        // const currentPlayerRemote = this.room.state.players.get(this.room.sessionId);
        // const ticksBehind = this.currentTick - currentPlayerRemote.tick;
        // console.log({ ticksBehind });

        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;
        this.inputPayload.tick = this.currentTick;
        this.room.send(0, this.inputPayload);

        const velocity = 128;
        const rotationSpeed = 0.05; // radians per update
    
        // Rotate left/right
        if (this.inputPayload.left) {
          this.currentPlayer.rotation -= rotationSpeed;
        } else if (this.inputPayload.right) {
          this.currentPlayer.rotation += rotationSpeed;
        }
        
        // Move forward/backward based on current rotation
        if (this.inputPayload.up) {
          const x = Math.cos(this.currentPlayer.rotation) * velocity;
          const y = Math.sin(this.currentPlayer.rotation) * velocity;
          this.currentPlayer.setVelocity(x, y);
        } else {
          this.currentPlayer.setVelocity(0, 0);
        }

        // Use the shared Player class to handle movement
        // const playerMovement = new Player(
        //     this.currentPlayer.x, 
        //     this.currentPlayer.y, 
        //     this.currentPlayer.rotation
        // );
        // playerMovement.applyInput(this.inputPayload, velocity);
        // this.currentPlayer.x = playerMovement.x;
        // this.currentPlayer.y = playerMovement.y;
        // this.currentPlayer.rotation = playerMovement.rotation;

        // this.localRef.x = this.currentPlayer.x;
        // this.localRef.y = this.currentPlayer.y;

        // for (let sessionId in this.playerEntities) {
        //     // interpolate all player entities
        //     // (except the current player)
        //     if (sessionId === this.room.sessionId) {
        //         continue;
        //     }

        //     const entity = this.playerEntities[sessionId];
        //     const { serverX, serverY, serverRotation } = entity.data.values;

        //     entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
        //     entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
        //     if (serverRotation !== undefined) {
        //         entity.rotation = serverRotation;
        //     }
        // }

    }

}
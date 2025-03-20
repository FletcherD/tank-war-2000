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

// Physics collision category constants
export const COLLISION_CATEGORIES = {
  NONE: 0,            // 0000 (0 in binary)
  WALL: 0x0001,       // 0001 (1 in binary)
  PLAYER: 0x0002,     // 0010 (2 in binary)
  PROJECTILE: 0x0004, // 0100 (4 in binary)
  PICKUP: 0x0008      // 1000 (8 in binary)
};

export class GameScene extends Phaser.Scene {
    playerEntities: { [sessionId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody } = {};
    walls: Phaser.Physics.Arcade.StaticGroup;

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    currentTick: number = 0;

    constructor() {
        super({ key: "game" });
    }

    addPlayer(x: number, y: number, sessionId: string)  {
      const entity = this.physics.add.image(x, y, 'tank');
      entity.setCircle(16);
      
      // Set up player physics body
      entity.body.setCollideWorldBounds(true);
      entity.body.setImmovable(false);  // Dynamic body that can be moved
      
      // Set collision category and what it collides with
      entity.body.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
      entity.body.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER]);
      
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
        // Enable Matter physics
        this.physics.world.setBoundsCollision(true, true, true, true);
        this.physics.enableUpdate();
        this.physics.world.defaults.debugShowBody = true;

        // Create a static group for walls
        this.walls = this.physics.add.staticGroup();
        
        // Add a wall
        const wall = this.walls.create(100, 100, 'wall');
        
        // Set up wall physics body
        wall.body.setCollisionCategory(COLLISION_CATEGORIES.WALL);
        wall.body.setCollidesWith([COLLISION_CATEGORIES.PLAYER]);
        wall.body.setImmovable(true);  // Static body that cannot be moved

        // Enable collisions between players and walls
        this.physics.add.collider(
          Object.values(this.playerEntities), 
          this.walls
        );

        // Enable collisions between players
        this.physics.add.collider(
          Object.values(this.playerEntities), 
          Object.values(this.playerEntities)
        );

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
        
        // Update collisions - this will be handled automatically by the physics engine
        // since we've set up collision categories and colliders in create()

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
import '@geckos.io/phaser-on-nodejs'
import Phaser from 'phaser'

import { Room } from "colyseus";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { MyRoomState } from "../rooms/GameRoom";

import { Encoder } from "@colyseus/schema";
Encoder.BUFFER_SIZE = 256 * 1024; // 256 KB

export class PhaserServer {
  game: Phaser.Game;
  
  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.HEADLESS,
      width: 800,
      height: 600,
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      autoFocus: false,
      audio: {
        noAudio: true
      }
    };
    
    this.game = new Phaser.Game(config);
  }
  
  createScene(SceneClass: typeof ServerGameScene, room: Room<MyRoomState>): ServerGameScene {
    const key = "game-" + room.roomId;
    
    // Create scene with proper configuration
    const scene = new SceneClass();
    // Set the key and other properties
    scene.sys.settings.key = key;
    scene.sys.settings.active = true;
    scene.sys.settings.visible = false;
    
    // Set room reference after creation
    scene.room = room;
    
    // Add the scene and start it
    this.game.scene.add(key, scene, true);
    console.log(`Created server game scene with key: ${key}`);
    
    return scene;
  }
  
  shutdown() {
    if (this.game) {
      this.game.destroy(true);
    }
  }
}

require('@geckos.io/phaser-on-nodejs');
import { Room } from "colyseus";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { MyRoomState } from "../rooms/GameRoom";

import { Encoder } from "@colyseus/schema";
Encoder.BUFFER_SIZE = 128 * 1024; // 128 KB

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
          gravity: { y: 0 },
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
    const scene = new SceneClass({ 
      key: key,
      active: true,
      visible: false,
      physics: {
        matter: {
          gravity: { y: 0 },
          debug: false
        }
      }
    }, room);
    
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
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
      try {
        // Fix for "Cannot read properties of undefined (reading 'destroy')" 
        // by ensuring TextureManager.stamp exists before destroying the game
        if (this.game.textures && !this.game.textures.stamp) {
          this.game.textures.stamp = {
            destroy: () => {} // Provide empty destroy method
          };
        }
        
        // Fix for "screen.orientation.removeEventListener is not a function"
        // JSDOM doesn't fully implement the screen.orientation API
        if (typeof global !== 'undefined' && global.screen && global.screen.orientation) {
          if (!global.screen.orientation.removeEventListener) {
            global.screen.orientation.removeEventListener = () => {};
          }
        }
        
        // Fix for "window.cancelAnimationFrame is not a function"
        if (typeof window !== 'undefined' && !window.cancelAnimationFrame) {
          window.cancelAnimationFrame = (id) => {
            if (id) clearTimeout(id);
          };
        }
        
        this.game.destroy(true);
      } catch (error) {
        console.error('Error shutting down Phaser game:', error);
      }
    }
  }
}

require('@geckos.io/phaser-on-nodejs');
import { Room } from "colyseus";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { MyRoomState } from "../rooms/GameRoom";

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
    const scene = new SceneClass({ key }, room);
    this.game.scene.add(key, scene, true);
    return scene;
  }
  
  shutdown() {
    if (this.game) {
      this.game.destroy(true);
    }
  }
}
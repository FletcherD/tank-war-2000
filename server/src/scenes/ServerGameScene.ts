import { GameScene } from "../../../shared/scenes/Game";
import { ServerTank } from "../entities/ServerTank";
import { InputData } from "../../../shared/objects/Tank";
import { Room } from "colyseus";
import { MyRoomState } from "../rooms/GameRoom";

export class ServerGameScene extends GameScene {
  players: Map<string, ServerTank> = new Map();
  room: Room<MyRoomState>;

  constructor(config: Phaser.Types.Scenes.SettingsConfig, room: Room<MyRoomState>) {
    super(config);
    this.room = room;
  }

  preload() {
    this.load.image('tileset', '../../../../assets/tiles/tileset.png');
    this.load.json('mapData', '../../../../assets/maps/Duff Gardens.json');
    this.load.json('tilesetData', '../../../../assets/tiles/tileset.json');
  }

  create() {
    super.create();
    console.log("ServerGameScene created");
  }

  addPlayer(sessionId: string, x: number, y: number): ServerTank {
    const tank = new ServerTank(this, x, y, sessionId);
    this.players.set(sessionId, tank);
    return tank;
  }

  removePlayer(sessionId: string) {
    const tank = this.players.get(sessionId);
    if (tank) {
      tank.destroy();
      this.players.delete(sessionId);
    }
  }

  handlePlayerInput(sessionId: string, input: InputData) {
    const tank = this.players.get(sessionId);
    if (tank) {
      tank.updateInput(input);
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    
    // Update schemas for all players
    this.players.forEach(tank => {
      tank.updateSchema();
    });
  }
}
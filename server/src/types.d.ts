import { Room } from "colyseus";
import { NewswireMessage, MyRoomState } from "./rooms/GameRoom";

// Extend the Room type to include the broadcastNewswire method
declare module "colyseus" {
  interface Room<State = any, Metadata = any, PublicMetadata = any, AuthOptions = any> {
    broadcastNewswire(message: NewswireMessage): void;
    SI?: any; // For SnapshotInterpolation
  }
}

// Express types
declare module "@colyseus/tools" {
  interface Express {
    use(path: string, handler: any): void;
    get(path: string, handler: any): void;
    post(path: string, handler: any): void;
  }
  
  interface Config {
    initializeExpress(app: any): void;
    initializeGameServer(server: any): void;
    beforeListen(): void;
  }
  
  export default function config(options: any): any;
}

// For the Scene type in Phaser to include players map
declare namespace Phaser {
  namespace Scene {
    interface Scene {
      players: Map<string, any>;
    }
  }
  
  namespace Physics.Matter {
    interface Body {
      position: Phaser.Math.Vector2;
    }
  }
}

// For tiles to have body property
declare namespace Phaser.Tilemaps {
  interface Tile {
    body: any;
  }
}
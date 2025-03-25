import { Tank, InputData } from "../../../shared/objects/Tank";
import { GameScene } from "../../../shared/scenes/Game";
import { ClientGameScene } from "../scenes/ClientGameScene";

export class ClientTank extends Tank {
  sessionId: string;
  isLocalPlayer: boolean;
  lastServerState: {
    x: number;
    y: number;
    heading: number;
    speed: number;
    health: number;
    team: number;
    tick: number;
  };
  inputBuffer: InputData[] = [];
  
  constructor(scene: ClientGameScene, x: number, y: number, sessionId: string, isLocalPlayer: boolean = false) {
    super(scene, x, y);
    this.sessionId = sessionId;
    this.isLocalPlayer = isLocalPlayer;
    this.lastServerState = {
      x: x,
      y: y,
      heading: 0,
      speed: 0,
      health: 100,
      team: 0,
      tick: 0
    };
  }

  updateFromServer(data: any): void {
    console.log(`Received update for ${this.sessionId} - x:${data.x.toFixed(2)}, y:${data.y.toFixed(2)}, isLocal:${this.isLocalPlayer}`);
    
    // Store server state for reconciliation
    this.lastServerState = {
      x: data.x,
      y: data.y,
      heading: data.heading,
      speed: data.speed,
      health: data.health,
      team: data.team,
      tick: data.tick
    };

    // For non-local players, directly update position
    if (!this.isLocalPlayer) {
      this.x = data.x;
      this.y = data.y;
      this.heading = data.heading;
      this.speed = data.speed;
      this.health = data.health;
      this.team = data.team;

      // Update input state
      this.currentInput.left = data.left;
      this.currentInput.right = data.right;
      this.currentInput.up = data.up;
      this.currentInput.down = data.down;
      this.currentInput.fire = data.fire;
      this.currentInput.tick = data.tick;
    } else {
      // For local player, reconcile if needed
      this.reconcileWithServer();
    }
  }

  reconcileWithServer(): void {
    // Simple reconciliation: if server position differs too much, snap to it
    const distanceToServer = Phaser.Math.Distance.Between(
      this.x, this.y, 
      this.lastServerState.x, this.lastServerState.y
    );

    // If distance is too large, correct position
    if (distanceToServer > 50) {
      this.x = this.lastServerState.x;
      this.y = this.lastServerState.y;
      this.rotation = this.lastServerState.heading;
      this.speed = this.lastServerState.speed;
    }
  }

  sendInput(input: InputData): void {
    // Store input for client-side prediction
    this.inputBuffer.push(input);
    
    // Update local state
    this.currentInput = input;
    
    // The actual sending will be handled by the scene
  }
}
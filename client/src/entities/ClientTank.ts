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
  pendingInputs: InputData[] = [];
  
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
      // For local player, perform reconciliation with rollback
      this.reconcileWithServer();
    }
  }

  reconcileWithServer(): void {
    // Remove inputs that have been processed by the server
    this.pendingInputs = this.pendingInputs.filter(input => input.tick > this.lastServerState.tick);
    
    // Cleanup input buffer to prevent memory leak
    // Only keep the last 100 inputs (about 1-2 seconds worth)
    const MAX_BUFFER_SIZE = 100;
    if (this.inputBuffer.length > MAX_BUFFER_SIZE) {
      this.inputBuffer = this.inputBuffer.slice(-MAX_BUFFER_SIZE);
    }
    
    // Check if we need to correct our position
    const distanceToServer = Phaser.Math.Distance.Between(
      this.x, this.y, 
      this.lastServerState.x, this.lastServerState.y
    );
    
    const headingDifference = Math.abs(this.heading - this.lastServerState.heading);
    const speedDifference = Math.abs(this.speed - this.lastServerState.speed);
    
    // If our prediction is too far off from server state, we need to reconcile
    const needsReconciliation = distanceToServer > 10 || headingDifference > 0.1 || speedDifference > 5;
    
    if (needsReconciliation) {
      console.log(`Reconciling position. Distance: ${distanceToServer.toFixed(2)}, Heading diff: ${headingDifference.toFixed(2)}`);
      
      // Rollback to server state
      this.x = this.lastServerState.x;
      this.y = this.lastServerState.y;
      this.heading = this.lastServerState.heading;
      this.speed = this.lastServerState.speed;
      this.rotation = this.heading;
      
      // Re-apply all pending inputs to get back to current predicted state
      const gameScene = this.scene as GameScene;
      const delta = gameScene.fixedTimeStep;
      
      // Save current input
      const currentInput = { ...this.currentInput };
      
      // Re-apply each pending input
      for (const input of this.pendingInputs) {
        this.currentInput = input;
        super.preUpdate(0, delta);
      }
      
      // Restore current input
      this.currentInput = currentInput;
      
      console.log(`After reconciliation: x=${this.x.toFixed(2)}, y=${this.y.toFixed(2)}`);
    }
  }

  sendInput(input: InputData): void {
    // Store input for client-side prediction
    this.inputBuffer.push(input);
    
    // Add to pending inputs for reconciliation
    this.pendingInputs.push({ ...input });
    
    // Update local state
    this.currentInput = input;
    
    // The actual sending will be handled by the scene
  }
}
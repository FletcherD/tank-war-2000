import { Tank, InputData } from "../../../shared/objects/Tank";
import { GameScene } from "../../../shared/scenes/Game";
import { ClientGameScene } from "../scenes/ClientGameScene";
import { VISUALS } from "../../../shared/constants";

export class ClientTank extends Tank {
  // Override fire() to do nothing - server will handle bullet creation
  override fire(): void {
    // Only play firing effects if cooldown is ready
    if (this.firingCooldown <= 0) {
      // Reset cooldown timer
      this.firingCooldown = this.firingRate;
      
      // Flash effect for firing
      this.setTint(0xFFFFFF);
      this.scene.time.delayedCall(50, () => {
        this.clearTint();
      });
      
      // Add firing visual effects only (no actual bullet)
      const angle = this.rotation;
      const fireLocation = new Phaser.Math.Vector2(VISUALS.FIRING_OFFSET, 0).rotate(angle);
      
      // Add muzzle flash particle effect
      const particles = this.scene.add.particles(this.x + fireLocation.x, this.y + fireLocation.y, 'bullet', {
        speed: 100,
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 100,
        quantity: 1
      });
      
      // Destroy the emitter after a short time
      this.scene.time.delayedCall(100, () => {
        particles.destroy();
      });
    }
  }
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
    pillboxCount: number;
  };
  pillboxCount: number = 0;
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
      tick: 0,
      pillboxCount: 0
    };

    // Set up tread frames
    this.createTreadFrames(scene);
  }

  updateFromServer(data: any): void {
    //console.log(`Received update for ${this.sessionId} - x:${data.x.toFixed(2)}, y:${data.y.toFixed(2)}, isLocal:${this.isLocalPlayer}`);
    
    // Store server state for reconciliation
    this.lastServerState = {
      x: data.x,
      y: data.y,
      heading: data.heading,
      speed: data.speed,
      health: data.health,
      team: data.team,
      tick: data.tick,
      pillboxCount: data.pillboxCount || 0
    };
    
    // Update pillbox count
    if (this.pillboxCount !== data.pillboxCount) {
      this.pillboxCount = data.pillboxCount || 0;
      
      // If this is the local player, we might want to update the UI
      if (this.isLocalPlayer) {
        const gameScene = this.scene as ClientGameScene;
        if (gameScene.gameUI) {
          gameScene.gameUI.updatePillboxCount(this.pillboxCount);
        }
      }
    }

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


  // Helper method to set up tread sprite frames
  createTreadFrames(scene: Phaser.Scene) {
    // Ensure the texture exists and has frame configurations
    const texture = scene.textures.get('tankTreads');
    
    // If the frames haven't been set up yet, create them
    if (texture.frameTotal <= 1) {
      // Create frames for a 31x2 grid of 32x32 sprites
      const frameWidth = 32;
      const frameHeight = 32;
      const framesPerRow = 31;
      
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < framesPerRow; col++) {
          const frameIndex = row * framesPerRow + col;
          texture.add(
            frameIndex, // Frame name (numeric index)
            0, // Source image index
            col * frameWidth, row * frameHeight, // Position in the atlas
            frameWidth, frameHeight // Size of the frame
          );
        }
      }
    }

    this.leftTread.setFrame(this.leftTreadPosition);
    this.rightTread.setFrame(this.rightTreadPosition);
  }
  
  // Helper method to animate treads based on speed and direction
  override animate(delta: number, speed: number, rotationSpeed: number) {
    const framesPerRow: number = 31;
    const animationSpeed: number = -0.02;
    const turningSpeed: number = -10;

    if (Math.abs(speed) > 0 || Math.abs(rotationSpeed) > 0) {
      // Calculate frame increment based on speed
      // Faster speed = faster animation
      let frameIncrementL = (speed * delta) * animationSpeed;
      let frameIncrementR = (speed * delta) * animationSpeed;
      
      // Handle turning - treads move in opposite directions when turning
      if (this.currentInput.left) {
        // Left tread moves backward, right tread moves forward
        frameIncrementL -= (rotationSpeed * delta) * turningSpeed;
        frameIncrementR += (rotationSpeed * delta) * turningSpeed;
      } else if (this.currentInput.right) {
        // Left tread moves forward, right tread moves backward
        frameIncrementL += (rotationSpeed * delta) * turningSpeed;
        frameIncrementR -= (rotationSpeed * delta) * turningSpeed;
      }

      function mod(n: number, m: number): number {
        return ((n % m) + m) % m;
      }

      this.leftTreadPosition = mod(this.leftTreadPosition + frameIncrementL, framesPerRow);
      this.rightTreadPosition = mod(this.rightTreadPosition + frameIncrementR, framesPerRow);

      this.leftTread.setFrame(Math.floor(this.leftTreadPosition));
      this.rightTread.setFrame(Math.floor(this.rightTreadPosition) + framesPerRow);
    }
  }
}
import { Tank, InputData } from "../../../shared/objects/Tank";
import { GameScene } from "../../../shared/scenes/Game";
import { ClientGameScene } from "../scenes/ClientGameScene";
import { VISUALS, PHYSICS, TEAM_COLORS } from "../../../shared/constants";

export class ClientTank extends Tank {
  sessionId: string;
  isLocalPlayer: boolean;
  nameText: Phaser.GameObjects.Text;
  lastServerState: {
    x: number;
    y: number;
    heading: number;
    speed: number;
    health: number;
    ammo: number;
    team: number;
    tick: number;
    pillboxCount: number;
    wood: number;
    name: string;
  };
  pillboxCount: number = 0;
  wood: number = 0;
  inputBuffer: InputData[] = [];
  pendingInputs: InputData[] = [];
  firingCooldown: number = 0;
  firingRate: number = PHYSICS.TANK_FIRE_COOLDOWN;
  
  constructor(scene: ClientGameScene, x: number, y: number, sessionId: string, isLocalPlayer: boolean = false, name: string = "Player") {
    super(scene, x, y);
    this.sessionId = sessionId;
    this.isLocalPlayer = isLocalPlayer;
    this.name = name;
    this.lastServerState = {
      x: x,
      y: y,
      heading: 0,
      speed: 0,
      health: 100,
      ammo: PHYSICS.TANK_MAX_AMMO,
      team: 0,
      tick: 0,
      pillboxCount: 0,
      wood: 0,
      name: name
    };

    // Apply team color if available
    if (this.team > 0 && TEAM_COLORS[this.team]) {
      this.tankBody.setTint(TEAM_COLORS[this.team]);
    }

    // Set up tread frames
    this.createTreadFrames(scene);
    
    // Add player name text if not local player
    if (!isLocalPlayer) {
      const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        color: "#ffffff",
        fontSize: "14px",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center"
      };
      
      this.nameText = scene.add.text(0, 30, name, textStyle);
      this.nameText.setOrigin(0.5, 0);
      this.add(this.nameText);
    }
  }

  applySnapshot(data) {
    this.x = data.x;
    this.y = data.y;
    this.heading = data.heading;
    this.speed = data.speed;
    this.health = data.health;
    
    // Update team and apply team color if it has changed
    if (this.team !== data.team) {
      this.team = data.team;
      
      // Apply team color if team > 0, otherwise clear tint
      if (this.team > 0 && TEAM_COLORS[this.team]) {
        this.tankBody.setTint(TEAM_COLORS[this.team]);
      } else {
        this.tankBody.clearTint();
      }
    }
    
    // Update input state
    this.currentInput.left = data.left;
    this.currentInput.right = data.right;
    this.currentInput.up = data.up;
    this.currentInput.down = data.down;
    this.currentInput.fire = data.fire;
    this.currentInput.tick = data.tick;
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
      ammo: data.ammo,
      team: data.team,
      tick: data.tick,
      pillboxCount: data.pillboxCount || 0,
      wood: data.wood || 0,
      name: data.name || this.name
    };
    
    // Update player name if changed
    if (data.name && this.name !== data.name) {
      this.name = data.name;
      if (this.nameText) {
        this.nameText.setText(this.name);
      }
    }
    
    // Update ammunition from server
    if (this.ammo !== data.ammo) {
      this.ammo = data.ammo;
    }
    
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
    
    // Update wood count
    if (this.wood !== data.wood) {
      this.wood = data.wood || 0;
      
      // If this is the local player, update the UI
      if (this.isLocalPlayer) {
        const gameScene = this.scene as ClientGameScene;
        if (gameScene.gameUI) {
          gameScene.gameUI.updateWoodCount(this.wood);
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
      
      // Update team and apply team color if it has changed
      if (this.team !== data.team) {
        this.team = data.team;
        
        // Apply team color if team > 0, otherwise clear tint
        if (this.team > 0 && TEAM_COLORS[this.team]) {
          this.tankBody.setTint(TEAM_COLORS[this.team]);
        } else {
          this.tankBody.clearTint();
        }
      }
      
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
    
    // Update team if it has changed
    if (this.team !== this.lastServerState.team) {
      this.team = this.lastServerState.team;
      
      // Apply team color if team > 0, otherwise clear tint
      if (this.team > 0 && TEAM_COLORS[this.team]) {
        this.tankBody.setTint(TEAM_COLORS[this.team]);
      } else {
        this.tankBody.clearTint();
      }
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
    
    //if (needsReconciliation) {
      //console.log(`Reconciling position. Distance: ${distanceToServer.toFixed(2)}, Heading diff: ${headingDifference.toFixed(2)}`);
      
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
        super.preUpdate(0, delta, true);
      }
      
      // Restore current input
      this.currentInput = currentInput;
      
      //console.log(`After reconciliation: x=${this.x.toFixed(2)}, y=${this.y.toFixed(2)}`);
    //}
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
    if(this.scene.currentPlayer && this.team == this.scene.currentPlayer.scene) {
        this.setDepth(200);
    }

    const framesPerRow: number = 31;
    const framesPerRotation: number = 60;
    const animationSpeed: number = 0.5;
    const turningSpeed: number = -10;

    const positionDiff = this.lastPosition.subtract(new Phaser.Math.Vector2(this.x, this.y));
    const effectiveDistanceTraveled = positionDiff.dot(new Phaser.Math.Vector2(1, 0).rotate(this.heading));

    function getTreadFrameForPosition(position: number): number {
      if (position > framesPerRow) return 0;
      return Math.floor(position);
    }

    if (Math.abs(effectiveDistanceTraveled) > 0 || Math.abs(rotationSpeed) > 0) {
      // Calculate frame increment based on speed
      // Faster speed = faster animation
      let frameIncrementL = effectiveDistanceTraveled * animationSpeed;
      let frameIncrementR = effectiveDistanceTraveled * animationSpeed;
      
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

      this.leftTreadPosition = mod(this.leftTreadPosition + frameIncrementL, framesPerRotation);
      this.rightTreadPosition = mod(this.rightTreadPosition + frameIncrementR, framesPerRotation);

      this.leftTread.setFrame(getTreadFrameForPosition(this.leftTreadPosition));
      this.rightTread.setFrame(getTreadFrameForPosition(this.rightTreadPosition) + framesPerRow);
    }
  }

  // Override fire() to do nothing - server will handle bullet creation
  override fire(): void { 
  }
}
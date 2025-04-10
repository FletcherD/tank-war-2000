import { Tank, InputData } from "../../../shared/objects/Tank";
import { GameScene } from "../../../shared/scenes/Game";
import { ClientGameScene } from "../scenes/ClientGameScene";
import { VISUALS, PHYSICS, TEAM_COLORS, COLLISION_CATEGORIES } from "../../../shared/constants";
import { GameUI } from "../UI";

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
  
  constructor(scene: ClientGameScene, x: number, y: number, sessionId: string, isLocalPlayer: boolean = false, name: string = "Player", team: number = 0) {
    super(scene, x, y);
    this.sessionId = sessionId;
    this.isLocalPlayer = isLocalPlayer;
    this.name = name;
    this.team = team;
    this.lastServerState = {
      x: x,
      y: y,
      heading: 0,
      speed: 0,
      health: PHYSICS.TANK_HEALTH,
      ammo: PHYSICS.TANK_MAX_AMMO,
      team: team,
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
        fontFamily: "'Courier Prime', monospace",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center"
      };
      
      // Create name text but don't add it as a child to the tank container
      // This keeps it independent of the tank's rotation
      this.nameText = scene.add.text(this.x, this.y - PHYSICS.TILE_SIZE, name, textStyle);
      this.nameText.setOrigin(0.5, 1);
    }
  }

  override createSprites() {
    // Create tank body sprite
    this.tankBody = this.scene.add.sprite(0, 0, 'tank');
    
    // Create left and right tread sprites
    // Left tread uses frames from top row (row 0)
    this.leftTread = this.scene.add.sprite(0, 0, 'tankTreads', 0);
    // Right tread uses frames from bottom row (row 1)
    this.rightTread = this.scene.add.sprite(0, 0, 'tankTreads', 31);
    
    // Create crosshair sprite (initially invisible)
    this.crosshair = this.scene.add.sprite(PHYSICS.BULLET_RANGE, 0, 'crosshair');
    this.crosshair.setVisible(false);
    
    this.add([this.tankBody, this.leftTread, this.rightTread, this.crosshair]);
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
    this.currentInput.targetHeading = data.targetHeading;
    this.currentInput.up = data.up;
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
    
    // Check for respawn state
    if (data.isRespawning !== undefined) {
      this.handleRespawnState(data.isRespawning, data.respawnTimer);
    }
    
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
    if (this.health !== data.health) {
      this.health = data.health;
    }
    
    // Update pillbox count
    if (this.pillboxCount !== data.pillboxCount) {      
      if (this.isLocalPlayer) {
        const gameScene = this.scene as ClientGameScene;
        if (gameScene.gameUI) {
          if (data.pillboxCount > this.pillboxCount) {
            gameScene.gameUI.showMessage("Picked up a pillbox!\nSelect a tile and place it for your team.")
            gameScene.gameUI.updatePillboxCount(data.pillboxCount);
          }
        }
      }

      this.pillboxCount = data.pillboxCount || 0;
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
      
      // Update the name text position to follow the tank
      if (this.nameText) {
        this.nameText.setPosition(this.x, this.y - 30);
      }
      
      // Update input state
      this.currentInput.targetHeading = data.targetHeading;
      this.currentInput.up = data.up;
      this.currentInput.fire = data.fire;
      this.currentInput.tick = data.tick;
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
      // Create frames for a 31x2 grid of sprites
      const frameWidth = PHYSICS.TILE_SIZE*2;
      const frameHeight = PHYSICS.TILE_SIZE*2;
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
    const gameScene = this.scene as ClientGameScene;
    if(gameScene.currentPlayer && this.team === gameScene.currentPlayer.team) {
        this.setDepth(1);
        if(this.nameText) {
            this.nameText.setDepth(1);
        }

        const visibility = (gameScene.gameMap.isEntityHiddenAt(this.x, this.y) ? 0.5 : 1.0);
        this.setAlpha(visibility);
    }
    else if(gameScene.currentPlayer && this.team !== gameScene.currentPlayer.team) {
        this.setDepth(1);
        if(this.nameText) {
            this.nameText.setDepth(1);
        }

        const isHidden = gameScene.gameMap.isEntityHiddenAt(this.x, this.y);
        this.setVisible(!isHidden);
        if(this.nameText) {
            this.nameText.setVisible(!isHidden);
        }
    }

    const framesPerRow: number = 31;
    const framesPerCycle: number = 60;
    const animSpeedForward: number = 0.01 * PHYSICS.TILE_SIZE;
    const animSpeedTurn: number = 10;

    const positionDiff = this.lastPosition.subtract(new Phaser.Math.Vector2(this.x, this.y));
    const distanceTraveled = positionDiff.dot(new Phaser.Math.Vector2(1, 0).rotate(this.heading));
    const distanceTurned = Phaser.Math.Wrap(Math.abs(this.heading - this.lastHeading), 0, Math.PI * 2);

    function getTreadFrameForPosition(position: number): number {
      if (position >= framesPerRow) return 0;
      return Math.floor(position);
    }

    if (Math.abs(distanceTraveled) > 0 || Math.abs(distanceTurned) > 0) {
      this.leftTreadPosition += distanceTraveled * animSpeedForward;
      this.rightTreadPosition += distanceTraveled * animSpeedForward;
      
      this.leftTreadPosition += distanceTurned * animSpeedTurn;
      this.rightTreadPosition -= distanceTurned * animSpeedTurn;

      function mod(n: number, m: number): number {
        return ((n % m) + m) % m;
      }

      this.leftTreadPosition = mod(this.leftTreadPosition, framesPerCycle);
      this.rightTreadPosition = mod(this.rightTreadPosition, framesPerCycle);

      this.leftTread.setFrame(getTreadFrameForPosition(this.leftTreadPosition));
      this.rightTread.setFrame(getTreadFrameForPosition(this.rightTreadPosition) + framesPerRow);
    }
  }

  // Override fire() to do nothing - server will handle bullet creation
  override fire(): void { 
  }
  
  // Track previous respawn state
  private wasRespawning: boolean = false;
  
  // Handle tank respawning state
  handleRespawnState(isRespawning: boolean, respawnTimer: number): void {
    // If this is the local player, show respawn UI
    if (this.isLocalPlayer) {
      const gameScene = this.scene as ClientGameScene;
      if (isRespawning) {
        // Make tank transparent when respawning
        this.setAlpha(0.5);
        
        // Deactivate physics body during respawn
        if (this.body) {
          this.setCollisionCategory(0);
        }
        
        // Show respawn message with timer
        if (gameScene.gameUI) {
          const remainingSeconds = Math.ceil(respawnTimer / 1000);
          gameScene.gameUI.showMessage(`Destroyed. Respawning in ${remainingSeconds}s...`, 1000);
        }
        
        // Update respawn state tracker
        this.wasRespawning = true;
      } else {
        // Tank is active again after respawn
        this.setAlpha(1);
        
        // Reactivate physics body
        if (this.body && this.scene.matter) {
          this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
        }
        
        // Show respawn complete message only when transitioning from respawning to not respawning
        if (this.wasRespawning && gameScene.gameUI) {
          this.wasRespawning = false;
        }
      }
    } else {
      // For non-local players, just update visuals
      this.setAlpha(isRespawning ? 0.5 : 1);
      
      // Update physics body status
      if (this.body) {
        this.setCollisionCategory(isRespawning ? 0 : COLLISION_CATEGORIES.PLAYER);
      }
    }
  }
  
  // Override playDamageAnimation to flash white
  override playDamageAnimation(): void {
    const scene = this.scene as Phaser.Scene;
    
    // Flash the tank white
    const originalTint = this.tankBody.tintTopLeft;
    
    // Set to white
    this.tankBody.setTint(0xffffff);
    
    // Reset tint after a short time
    scene.time.delayedCall(100, () => {
      if (this.active) {
        if (originalTint !== 0xffffff) {
          this.tankBody.setTint(originalTint);
        } else {
          this.tankBody.clearTint();
        }
      }
    });
  }
  
  // Override onDestroyed to handle visual effects
  override onDestroyed(attackerId: string = ""): void {
    // Add destruction visual effects here
    const scene = this.scene as Phaser.Scene;
    
    // Flash the tank red
    scene.tweens.add({
      targets: this,
      alpha: 0.2,
      duration: 100,
      ease: 'Linear',
      yoyo: true,
      repeat: 3
    });
    
    // Add a larger destruction animation
    this.playDestroyAnimation();
    
    // Don't actually destroy the tank as the server will handle respawning
    // super.destroy() would be called here in the base class
  }
  
  // Play a larger white circle explosion animation when destroyed
  playDestroyAnimation(): void {
    const scene = this.scene;
    
    // Create a white circle at the tank's position
    const explosion = scene.add.circle(this.x, this.y, 30, 0xffffff, 1);
    explosion.setDepth(1001); // Above most objects
    
    // Animate the circle - fade out and grow
    scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 2.5,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        explosion.destroy();
      }
    });
  }
  
  // Override destroy to clean up nameText
  override destroy(fromScene?: boolean): void {
    // Clean up the nameText if it exists
    if (this.nameText) {
      this.nameText.destroy();
    }
    
    // Call parent destroy method
    super.destroy(fromScene);
  }
}
import { Tank, InputData } from "../../../shared/objects/Tank";
import { TankSchema } from "../schemas/TankSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";

export class ServerTank extends Tank {
  sessionId: string;
  schema: TankSchema;
  
  constructor(scene: ServerGameScene, x: number, y: number, sessionId: string) {
    super(scene, x, y);
    this.sessionId = sessionId;
    this.schema = new TankSchema();
    this.updateSchema();
  }

  updateInput(input: InputData): void {
    this.currentInput = input;
    this.updateSchema();
  }

  updateSchema(): void {
    // Instead of just assignment, explicitly set each property to trigger change detection
    if (this.schema.x !== this.x) this.schema.x = this.x;
    if (this.schema.y !== this.y) this.schema.y = this.y;
    if (this.schema.heading !== this.heading) this.schema.heading = this.heading;
    if (this.schema.speed !== this.speed) this.schema.speed = this.speed;
    if (this.schema.health !== this.health) this.schema.health = this.health;
    if (this.schema.team !== this.team) this.schema.team = this.team;
    if (this.schema.left !== this.currentInput.left) this.schema.left = this.currentInput.left;
    if (this.schema.right !== this.currentInput.right) this.schema.right = this.currentInput.right;
    if (this.schema.up !== this.currentInput.up) this.schema.up = this.currentInput.up;
    if (this.schema.down !== this.currentInput.down) this.schema.down = this.currentInput.down;
    if (this.schema.fire !== this.currentInput.fire) this.schema.fire = this.currentInput.fire;
    if (this.schema.tick !== this.currentInput.tick) this.schema.tick = this.currentInput.tick;
  }

  override fire() {
    // Only fire if cooldown is complete
    if (this.firingCooldown <= 0) {
      const scene = this.scene as ServerGameScene;
      
      // Calculate bullet spawn position
      const angle = this.rotation;
      const bulletX = this.x + Math.cos(angle) * 30; // Offset from tank center
      const bulletY = this.y + Math.sin(angle) * 30;
      
      // Create a server bullet with this tank as owner
      scene.createBullet(bulletX, bulletY, angle, this.team, this.sessionId);
      
      // Reset cooldown
      this.firingCooldown = this.firingRate;
    }
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.updateSchema();
  }
}
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
    if (this.schema.rotation !== this.rotation) this.schema.rotation = this.rotation;
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
    super.fire();
    // Additional server-side logic for firing could go here
    // For example, notifying other players about the bullet
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.updateSchema();
  }
}
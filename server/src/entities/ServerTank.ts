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
    this.schema.x = this.x;
    this.schema.y = this.y;
    this.schema.rotation = this.rotation;
    this.schema.speed = this.speed;
    this.schema.health = this.health;
    this.schema.team = this.team;
    this.schema.left = this.currentInput.left;
    this.schema.right = this.currentInput.right;
    this.schema.up = this.currentInput.up;
    this.schema.down = this.currentInput.down;
    this.schema.fire = this.currentInput.fire;
    this.schema.tick = this.currentInput.tick;
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
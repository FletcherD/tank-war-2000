export interface InputData {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  tick: number;
}

export class Player {
  x: number;
  y: number;
  rotation: number; // in radians
  
  constructor(x: number = 0, y: number = 0, rotation: number = 0) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
  }

  applyInput(input: InputData, velocity: number): void {
    const rotationSpeed = 0.05; // radians per update
    
    // Rotate left/right
    if (input.left) {
      this.rotation -= rotationSpeed;
    } else if (input.right) {
      this.rotation += rotationSpeed;
    }
    
    // Move forward/backward based on current rotation
    if (input.up) {
      this.x += Math.cos(this.rotation) * velocity;
      this.y += Math.sin(this.rotation) * velocity;
    } else if (input.down) {
      this.x -= Math.cos(this.rotation) * velocity;
      this.y -= Math.sin(this.rotation) * velocity;
    }
  }
}
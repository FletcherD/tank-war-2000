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
  
  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  applyInput(input: InputData, velocity: number): void {
    if (input.left) {
      this.x -= velocity;
    } else if (input.right) {
      this.x += velocity;
    }

    if (input.up) {
      this.y -= velocity;
    } else if (input.down) {
      this.y += velocity;
    }
  }
}
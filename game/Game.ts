
// Physics collision category constants
export const COLLISION_CATEGORIES = {
  NONE: 0,            // 0000 (0 in binary)
  WALL: 0x0001,       // 0001 (1 in binary)
  PLAYER: 0x0002,     // 0010 (2 in binary)
  PROJECTILE: 0x0004, // 0100 (4 in binary)
  PICKUP: 0x0008      // 1000 (8 in binary)
};

export interface InputData {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  tick: number;
}

export class Tank extends Phaser.GameObjects.Image
{
  currentInput: InputData = {
      left: false,
      right: false,
      up: false,
      down: false,
      tick: 0,
  };

  constructor (scene: Phaser.Scene, x: number, y: number)
  {
      super(scene, x, y, 'tank');
      scene.add.existing(this);
      scene.physics.add.existing(this);
      // Set up player physics body
      this.body.setCircle(16);
      this.body.setImmovable(false);  // Dynamic body that can be moved
      
      // Set collision category and what it collides with
      this.body.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
      this.body.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER]);
  }

  preUpdate(time: number, delta: number)
  {
      const velocity = 128;
      const rotationSpeed = 0.05; // radians per update
  
      // Rotate left/right
      if (this.currentInput.left) {
        this.rotation -= rotationSpeed;
      } else if (this.currentInput.right) {
        this.rotation += rotationSpeed;
      }
      
      // Move forward/backward based on current rotation
      if (this.currentInput.up) {
        const x = Math.cos(this.rotation) * velocity;
        const y = Math.sin(this.rotation) * velocity;
        this.body.setVelocity(x, y);
      } else {
        this.body.setVelocity(0, 0);
      }

  }
}

export class Wall extends Phaser.Physics.Arcade.Image
{
  constructor (scene: GameScene, x: number, y: number)
  {
      super(scene, x, y, 'wall');
      scene.add.existing(this);
      scene.physics.add.existing(this);
      scene.walls.add(this);
      
      this.body.setCollisionCategory(COLLISION_CATEGORIES.WALL);
      this.body.setCollidesWith([COLLISION_CATEGORIES.PLAYER]);
  }
}


export class GameScene extends Phaser.Scene {
    playerEntities: { [sessionId: string]: Tank } = {};
    walls: Phaser.Physics.Arcade.StaticGroup;

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    currentTick: number = 0;

    constructor() {
      console.log("GameScene constructor");
        super({ key: "game" });
    }

    addPlayer(x: number, y: number, sessionId: string): Tank  {
      const entity = new Tank(this, x, y); 
      this.playerEntities[sessionId] = entity;
      return entity;
    }

    removePlayer(sessionId: string) {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId]
      }
    }

    async create() {
      console.log("GameScene create");
        // Enable Matter physics
        this.physics.world.setBoundsCollision(true, true, true, true);
        this.physics.enableUpdate();
        this.physics.world.defaults.debugShowBody = true;

        // Create a static group for walls
        this.walls = this.physics.add.staticGroup();
        
        // Add a wall
        new Wall(this, 100, 100);
        
        // Enable collisions between players and walls
        this.physics.add.collider(
          Object.values(this.playerEntities), 
          this.walls
        );

        // Enable collisions between players
        this.physics.add.collider(
          Object.values(this.playerEntities), 
          Object.values(this.playerEntities)
        );

        // this.cameras.main.startFollow(this.ship, true, 0.2, 0.2);
        // this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, 800, 600);
    }

    update(time: number, delta: number): void {
        this.elapsedTime += delta;
        while (this.elapsedTime >= this.fixedTimeStep) {
            this.elapsedTime -= this.fixedTimeStep;
            this.fixedTick(time, this.fixedTimeStep);
        }
    }

    fixedTick(time: number, delta: number) {
        this.currentTick++;
    }

}
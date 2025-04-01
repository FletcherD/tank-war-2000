// Game Physics & Movement Constants
export const PHYSICS = {
  // Tank movement
  TANK_MAX_SPEED: 1, // meters/msec
  TANK_ROTATION_SPEED: 0.002, // radians/msec
  TANK_ACCELERATION: 0.005, // meters/msec^2
  TANK_HEALTH: 100,
  TANK_MAX_AMMO: 20,
  TANK_AMMO_PER_SHOT: 1,
  TANK_FIRE_COOLDOWN: 1000, // milliseconds
  TANK_HITBOX_RADIUS: 14, // pixels

  // Bullets
  BULLET_SPEED: 10, // units per msec
  BULLET_RANGE: 256, // pixels (max travel distance)
  BULLET_HITBOX_RADIUS: 1, // pixels
  BULLET_BOUNCE: 1, // bounce factor

  // Pillbox
  PILLBOX_DETECTION_RANGE: 256, // pixels
  PILLBOX_FIRE_COOLDOWN: 500, // milliseconds
  PILLBOX_HEALTH: 8,
  PILLBOX_HITBOX_RADIUS: 16, // pixels

  // Station
  STATION_CAPTURE_RANGE: 16, // pixels
  STATION_REFILL_RATE: 5, // ammo per second

  // Game timing
  FIXED_TIMESTEP: 1000 / 60, // 60 FPS
};

// Collision Categories
export const COLLISION_CATEGORIES = {
  NONE: 0,            // 0000 (0 in binary)
  WALL: 0x0001,       // 0001 (1 in binary)
  PLAYER: 0x0002,     // 0010 (2 in binary)
  PROJECTILE: 0x0004, // 0100 (4 in binary)
  PICKUP: 0x0008      // 1000 (8 in binary)
};

// Team Colors
export const TEAM_COLORS = {
  1: 0x0000ff, // Blue for team 1
  2: 0xff0000  // Red for team 2
};

// UI & Visual Constants
export const VISUALS = {
  GRASS_COLOR: 0x007d3e,
  WATER_COLOR: 0x00b8d7,
  FIRING_OFFSET: 16.0, // distance from center to spawn bullets
};

// Damage Values
export const DAMAGE = {
  BULLET_TO_TANK: 1,
  BULLET_TO_PILLBOX: 1,
};

export const TILE_INDICES = {
  WALL: 0,
  WATER: 64,
  SWAMP: 128,
  CRATER: 192,
  ROAD: 256,
  FOREST: 320,
  GRASS: 384,
  DEEP_SEA: 448,
};
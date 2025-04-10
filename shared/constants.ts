export const TILE_SIZE = 32;

// Game Physics & Movement Constants
export const PHYSICS = {
  TILE_SIZE: TILE_SIZE,

  // Tank movement
  TANK_MAX_SPEED: (0.071875 * TILE_SIZE),
  TANK_ROTATION_SPEED: 0.0025, // radians/timestep
  TANK_ACCELERATION: (0.0003125 * TILE_SIZE), // meters/timestep^2
  TANK_HEALTH: 7,
  TANK_MAX_AMMO: 20,
  TANK_AMMO_PER_SHOT: 1,
  TANK_FIRE_COOLDOWN: 500, // milliseconds
  TANK_HITBOX_RADIUS: TILE_SIZE * 0.8, // pixels
  TANK_MAX_WOOD: 25, // maximum wood a tank can carry

  // Bullets
  BULLET_SPEED: (0.390625 * TILE_SIZE), // units/timestep
  BULLET_RANGE: TILE_SIZE * 16, // pixels (max travel distance)
  BULLET_HITBOX_RADIUS: (1/16) * TILE_SIZE, // pixels
  BULLET_BOUNCE: 1, // bounce factor

  // Pillbox
  PILLBOX_DETECTION_RANGE: TILE_SIZE * 17, // pixels
  PILLBOX_FIRE_COOLDOWN: 500, // milliseconds
  PILLBOX_HEALTH: 7,
  PILLBOX_HITBOX_RADIUS: TILE_SIZE, // pixels

  // Station
  STATION_CAPTURE_RANGE: TILE_SIZE * 2, // pixels
  STATION_REFILL_RATE: 5, // ammo per second

  BUILD_MAX_DISTANCE: TILE_SIZE * 6,
  
  // Building and resources
  BUILD_TIME_PER_TILE: 500, // milliseconds per tile
  WOOD_PER_FOREST_TILE: 2, // wood collected per forest tile
  WOOD_COST_ROAD: 1, // wood required to build a road tile
  WOOD_COST_WALL: 1, // wood required to build a wall tile

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
  1: 0x2222ff, // Blue for team 1
  2: 0xff0000  // Red for team 2
};

// UI & Visual Constants
export const VISUALS = {
  GRASS_COLOR: 0x007d3e,
  WATER_COLOR: 0x00b8d7,
  FIRING_OFFSET: TILE_SIZE, // distance from center to spawn bullets
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
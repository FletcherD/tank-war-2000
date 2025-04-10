import { GameMap } from "./Map";
import { Tank } from "../objects/Tank";
import { Bullet } from "../objects/Bullet";
import { Pillbox } from "../objects/Pillbox";
import { Station } from "../objects/Station";
import { PHYSICS, DAMAGE, TEAM_COLORS, TILE_INDICES } from "../constants";

export { InputData } from "../objects/Tank";

export class GameScene extends Phaser.Scene {
    matter: Phaser.Physics.Matter.MatterPhysics;
    
    // Map instance
    gameMap: GameMap;

    elapsedTime = 0;
    fixedTimeStep = PHYSICS.FIXED_TIMESTEP;

    currentTick: number = 0;
    
    // For displaying debug information
    debugText: string = "";
    
    // Pillboxes
    pillboxes: Pillbox[] = [];
    
    // Stations
    stations: Station[] = [];
    teamStations: { [team: number]: Station[] } = {};

    constructor() {
        super({ key: "game" });
    }

    // Player management has been moved to client/server-specific implementations
    
    addPillbox(x: number, y: number, team: number = 0): Pillbox {
      const pillbox = new Pillbox(this, x, y, team);
      this.pillboxes.push(pillbox);
      return pillbox;
    }
    

    async create() {
        // Set up collision event handler
        this.matter.world.on('collisionstart', this.handleCollision, this);

        // // Set camera bounds to match the map size
        // this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        
        // const pillboxLocations = mapData.pillboxes;
        // // Add pillboxes to the map
        // for (const location of pillboxLocations) {
        //     const worldLocation = this.gameMap.groundLayer.tileToWorldXY(location[0]*2+1, location[1]*2+1);
        //     this.addPillbox(worldLocation.x, worldLocation.y, 0);
        // }
        
        // // Add stations to the map
        // if (mapData.stations) {
        //     const stationLocations = mapData.stations;
        //     for (const location of stationLocations) {
        //         const worldLocation = this.gameMap.groundLayer.tileToWorldXY(location[0]*2+1, location[1]*2+1);
        //         this.addStation(worldLocation.x, worldLocation.y, 0); // Neutral station
        //     }
            
        //     // Assign one random station to each team
        //     if (this.stations.length >= 2) {
        //         // Get two random indexes for team stations
        //         const indices = Phaser.Utils.Array.NumberArray(0, this.stations.length - 1);
        //         Phaser.Utils.Array.Shuffle(indices);
                
        //         // Assign team 1 station
        //         const team1StationIndex = indices[0];
        //         this.stations[team1StationIndex].team = 1;
        //         this.stations[team1StationIndex].topSprite.setTint(TEAM_COLORS[1]);
                
        //         // Update team stations array
        //         if (!this.teamStations[1]) {
        //             this.teamStations[1] = [];
        //         }
        //         this.teamStations[1].push(this.stations[team1StationIndex]);
                
        //         // Assign team 2 station
        //         const team2StationIndex = indices[1];
        //         this.stations[team2StationIndex].team = 2;
        //         this.stations[team2StationIndex].topSprite.setTint(TEAM_COLORS[2]);
                
        //         // Update team stations array
        //         if (!this.teamStations[2]) {
        //             this.teamStations[2] = [];
        //         }
        //         this.teamStations[2].push(this.stations[team2StationIndex]);
        //     }
        // }
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

    handleCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
        // Get colliding pairs
        const pairs = event.pairs;
        
        // Process each collision pair
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // Matter.js collision objects contain game objects in their gameObject property
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // First, check for bullet collisions
            let bullet: Bullet | null = null;
            let otherBody: any = null;
            
            if (bodyA.gameObject instanceof Bullet) {
                bullet = bodyA.gameObject as Bullet;
                otherBody = bodyB;
            } else if (bodyB.gameObject instanceof Bullet) {
                bullet = bodyB.gameObject as Bullet;
                otherBody = bodyA;
            }
            
            if (bullet) {
                if (otherBody.gameObject instanceof Tank) {
                    const tank = otherBody.gameObject as Tank;
                    tank.takeDamage(DAMAGE.BULLET_TO_TANK, bullet.ownerId);
                    bullet.destroy();
                } else if (otherBody.gameObject instanceof Pillbox) {
                    const pillbox = otherBody.gameObject as Pillbox;
                    pillbox.takeDamage(DAMAGE.BULLET_TO_PILLBOX, bullet.ownerId);
                    bullet.destroy();
                } else {
                    this.handleWallBulletCollision(bullet, otherBody);
                }
                continue; // Skip to next collision pair after handling bullet
            }
            
            // Now check for tank-station collisions (no bullets involved)
            let tank: Tank | null = null;
            let station: Station | null = null;
            
            if (bodyA.gameObject instanceof Tank) {
                tank = bodyA.gameObject as Tank;
                if (bodyB.gameObject instanceof Station) {
                    station = bodyB.gameObject as Station;
                }
            } else if (bodyB.gameObject instanceof Tank) {
                tank = bodyB.gameObject as Tank;
                if (bodyA.gameObject instanceof Station) {
                    station = bodyA.gameObject as Station;
                }
            }
            
            // Handle tank-station collision (station capture)
            if (tank && station) {
                // Only capture if tank and station are on different teams
                if (tank.team !== station.team) {
                    // Call the station's capture method (will be implemented on server)
                    station.capture(tank.team);
                }
            }
        }
    }

    handleWallBulletCollision(bullet: Bullet, wall: MatterJS.Body) {
        bullet.destroy();
        const wallTilePos = wall.position;
        this.gameMap.map.setLayer(0);
        const wallTile = this.gameMap.map.getTileAtWorldXY(wallTilePos.x, wallTilePos.y);

        const wangIndex = wallTile.index % 64;
        const newTileIndex = TILE_INDICES.CRATER + wangIndex;
        this.gameMap.setTile(wallTile.x, wallTile.y, newTileIndex, false);
    }
}
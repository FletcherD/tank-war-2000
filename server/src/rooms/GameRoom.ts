import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { InputData } from "../../../shared/scenes/Game";

export class PlayerState extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation: number;
  @type("number") tick: number;
  inputQueue: InputData[] = [];
}

export class MyRoomState extends Schema {
  @type("number") mapWidth: number;
  @type("number") mapHeight: number;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

export class GameRoom extends Room<MyRoomState> {
  state = new MyRoomState();
  fixedTimeStep = 1000 / 60;

  onCreate (options: any) {
    // set map dimensions
    this.state.mapWidth = 800;
    this.state.mapHeight = 600;

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
    });

    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  fixedTick(timeStep: number) {
    const velocity = 2;

    this.state.players.forEach(player => {
      let input: InputData;

      // dequeue player inputs
      while (input = player.inputQueue.shift()) {
        // Use the shared Player class to handle movement
        // const playerMovement = new Player(player.x, player.y, player.rotation);
        // playerMovement.applyInput(input, velocity);
        // player.x = playerMovement.x;
        // player.y = playerMovement.y;
        // player.rotation = playerMovement.rotation;

        // player.tick = input.tick;
      }
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const player = new PlayerState();
    player.x = Math.random() * this.state.mapWidth;
    player.y = Math.random() * this.state.mapHeight;
    player.rotation = 0;

    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}

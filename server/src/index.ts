import { listen } from "@colyseus/tools";
 
// Import Colyseus config
import app from "./app.config";
import { startProfiling } from "./profile";

// Start CPU profiling if enabled via env variable
if (process.env.PROFILE === "true") {
  startProfiling();
}
 
// Create and listen on 2567 (or PORT environment variable.)
listen(app);
import { ClientGameScene } from "./scenes/ClientGameScene";

export class GameUI {
  private uiContainer: HTMLDivElement;
  private healthBarContainer: HTMLDivElement;
  private healthBarElement: HTMLDivElement;
  private healthTextElement: HTMLDivElement;
  private gameScene: ClientGameScene;

  constructor(gameScene: ClientGameScene) {
    this.gameScene = gameScene;
    this.createUI();
  }

  private createUI() {
    // Get the canvas element
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Game canvas not found');
      return;
    }

    // Create a UI container that overlays exactly on the canvas
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'gameContainer';
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.top = canvas.offsetTop + 'px';
    this.uiContainer.style.left = canvas.offsetLeft + 'px';
    this.uiContainer.style.width = canvas.offsetWidth + 'px';
    this.uiContainer.style.height = canvas.offsetHeight + 'px';
    this.uiContainer.style.pointerEvents = 'none'; // Allow clicks to pass through to game
    this.uiContainer.style.zIndex = '10';
    document.body.appendChild(this.uiContainer);

    // Create the status container (already defined in CSS)
    this.healthBarContainer = document.createElement('div');
    this.healthBarContainer.id = 'statusContainer';
    this.uiContainer.appendChild(this.healthBarContainer);

    // Create health bar container
    const healthBarOuter = document.createElement('div');
    healthBarOuter.className = 'progress';
    this.healthBarContainer.appendChild(healthBarOuter);

    // Create health bar
    this.healthBarElement = document.createElement('div');
    this.healthBarElement.id = 'bar1Bar';
    healthBarOuter.appendChild(this.healthBarElement);

    // Create health text
    this.healthTextElement = document.createElement('div');
    this.healthTextElement.className = 'percent';
    this.healthTextElement.style.fontFamily = "'Courier Prime', monospace";
    this.healthTextElement.style.fontWeight = "700";
    healthBarOuter.appendChild(this.healthTextElement);

    // Update UI container position when window resizes
    window.addEventListener('resize', () => this.updateUIPosition());

    // Initial update
    this.updateHealthBar(100);
  }

  /**
   * Updates the UI container position to match the canvas
   */
  private updateUIPosition() {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas || !this.uiContainer) return;
    
    this.uiContainer.style.top = canvas.offsetTop + 'px';
    this.uiContainer.style.left = canvas.offsetLeft + 'px';
    this.uiContainer.style.width = canvas.offsetWidth + 'px';
    this.uiContainer.style.height = canvas.offsetHeight + 'px';
  }

  /**
   * Updates the health bar with the current player's health
   */
  public updateHealthBar(health: number) {
    if (!this.healthBarElement || !this.healthTextElement) return;
    
    // Update health bar width
    this.healthBarElement.style.width = `${health}%`;
    
    // Update health text
    this.healthTextElement.textContent = `Health: ${health}%`;
  }

  /**
   * Updates the UI based on the current game state
   */
  public update() {
    if (this.gameScene.currentPlayer) {
      this.updateHealthBar(this.gameScene.currentPlayer.health);
    }
    
    // Regularly check if the canvas position/size has changed
    this.updateUIPosition();
  }
}
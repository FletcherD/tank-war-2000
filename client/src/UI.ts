import { ClientGameScene } from "./scenes/ClientGameScene";

export class GameUI {
  private uiContainer: HTMLDivElement;
  private healthBarContainer: HTMLDivElement;
  private healthBarElement: HTMLDivElement;
  private healthTextElement: HTMLDivElement;
  private buildButton: HTMLButtonElement;
  private cancelBuildButton: HTMLButtonElement;
  private messageElement: HTMLDivElement;
  private messageTimeout: number | null = null;
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
    
    // Create Build Road button
    this.buildButton = document.createElement('button');
    this.buildButton.textContent = 'Build Road';
    this.buildButton.style.position = 'absolute';
    this.buildButton.style.bottom = '20px';
    this.buildButton.style.right = '20px';
    this.buildButton.style.padding = '10px 20px';
    this.buildButton.style.backgroundColor = '#4CAF50';
    this.buildButton.style.color = 'white';
    this.buildButton.style.border = 'none';
    this.buildButton.style.borderRadius = '5px';
    this.buildButton.style.cursor = 'pointer';
    this.buildButton.style.fontFamily = "'Courier Prime', monospace";
    this.buildButton.style.fontWeight = "700";
    this.buildButton.style.pointerEvents = 'auto'; // Allow button clicks
    this.buildButton.onclick = () => this.gameScene.buildRoad();
    this.uiContainer.appendChild(this.buildButton);
    
    // Create Cancel Build button (initially hidden)
    this.cancelBuildButton = document.createElement('button');
    this.cancelBuildButton.textContent = 'Cancel Build';
    this.cancelBuildButton.style.position = 'absolute';
    this.cancelBuildButton.style.bottom = '20px';
    this.cancelBuildButton.style.right = '150px'; // Position to the left of build button
    this.cancelBuildButton.style.padding = '10px 20px';
    this.cancelBuildButton.style.backgroundColor = '#f44336'; // Red
    this.cancelBuildButton.style.color = 'white';
    this.cancelBuildButton.style.border = 'none';
    this.cancelBuildButton.style.borderRadius = '5px';
    this.cancelBuildButton.style.cursor = 'pointer';
    this.cancelBuildButton.style.fontFamily = "'Courier Prime', monospace";
    this.cancelBuildButton.style.fontWeight = "700";
    this.cancelBuildButton.style.pointerEvents = 'auto';
    this.cancelBuildButton.style.display = 'none'; // Initially hidden
    this.cancelBuildButton.onclick = () => this.gameScene.cancelBuild("Construction canceled by player.");
    this.uiContainer.appendChild(this.cancelBuildButton);
    
    // Create message element for notifications
    this.messageElement = document.createElement('div');
    this.messageElement.style.position = 'absolute';
    this.messageElement.style.top = '100px';
    this.messageElement.style.left = '50%';
    this.messageElement.style.transform = 'translateX(-50%)';
    this.messageElement.style.padding = '10px 20px';
    this.messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.messageElement.style.color = 'white';
    this.messageElement.style.borderRadius = '5px';
    this.messageElement.style.fontFamily = "'Courier Prime', monospace";
    this.messageElement.style.fontWeight = "700";
    this.messageElement.style.display = 'none';
    this.messageElement.style.zIndex = '20';
    this.uiContainer.appendChild(this.messageElement);

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
    this.healthTextElement.textContent = `Health:\u00A0${health}%`;
  }

  /**
   * Updates the UI based on the current game state
   */
  public update() {
    if (this.gameScene.currentPlayer) {
      this.updateHealthBar(this.gameScene.currentPlayer.health);
    }
    
    // Update build buttons based on building state
    if (this.gameScene.isBuilding) {
      this.buildButton.style.display = 'none';
      this.cancelBuildButton.style.display = 'block';
    } else {
      this.buildButton.style.display = 'block';
      this.cancelBuildButton.style.display = 'none';
    }
    
    // Regularly check if the canvas position/size has changed
    this.updateUIPosition();
  }
  
  /**
   * Shows a temporary message to the player
   * @param message The message to display
   * @param duration How long to show the message in milliseconds (default 3000ms)
   */
  public showMessage(message: string, duration: number = 3000) {
    // Clear any existing message timeout
    if (this.messageTimeout !== null) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    
    // Set message content and show it
    this.messageElement.textContent = message;
    this.messageElement.style.display = 'block';
    
    // Hide message after duration
    this.messageTimeout = window.setTimeout(() => {
      this.messageElement.style.display = 'none';
      this.messageTimeout = null;
    }, duration);
  }
}

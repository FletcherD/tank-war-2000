import { ClientGameScene } from "./scenes/ClientGameScene";
import { PHYSICS, TILE_INDICES } from "../../shared/constants";
import * as nipplejs from 'nipplejs';

export class GameUI {
  private uiContainer: HTMLDivElement;
  private healthBarContainer: HTMLDivElement;
  private healthBarElement: HTMLDivElement;
  private healthTextElement: HTMLDivElement;
  private buildButton: HTMLButtonElement;
  private buildWallButton: HTMLButtonElement;
  private cancelBuildButton: HTMLButtonElement;
  private placePillboxButton: HTMLButtonElement;
  private pillboxCountElement: HTMLDivElement;
  private woodCountElement: HTMLDivElement;
  private harvestWoodButton: HTMLButtonElement;
  private messageElement: HTMLDivElement;
  private messageTimeout: number | null = null;
  private gameScene: ClientGameScene;
  
  // Newswire elements
  private newswireContainer: HTMLDivElement;
  private newswire: HTMLDivElement;
  private newswireText: HTMLDivElement;
  private recentMessageContainer: HTMLDivElement;
  private newswireExpandButton: HTMLButtonElement;
  private isNewswireExpanded: boolean = false;
  private maxNewswireMessages: number = 20;
  
  // Chat elements
  private chatContainer: HTMLDivElement;
  private chatInput: HTMLInputElement;
  private chatButton: HTMLButtonElement;
  private isChatActive: boolean = false;
  
  // Touch controls
  private joystickContainer: HTMLDivElement;
  private joystickManager: nipplejs.JoystickManager;
  private fireButton: HTMLDivElement;
  
  // Context menu for building/harvesting
  private contextMenu: HTMLDivElement;
  private harvestWoodContextButton: HTMLDivElement;
  private buildRoadContextButton: HTMLDivElement;
  private buildWallContextButton: HTMLDivElement;
  
  // Map entity status display
  private mapStatusContainer: HTMLDivElement;
  private stationIcons: HTMLDivElement[] = [];
  private pillboxIcons: HTMLDivElement[] = [];

  constructor(gameScene: ClientGameScene) {
    this.gameScene = gameScene;
    this.createUI();
  }

  private ammoBarContainer: HTMLDivElement;
  private ammoBarElement: HTMLDivElement;
  private ammoTextElement: HTMLDivElement;
  
  // Wood bar elements
  private woodBarContainer: HTMLDivElement;
  private woodBarElement: HTMLDivElement;
  private woodTextElement: HTMLDivElement;

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
    
    // Create joystick container for touch controls
    this.joystickContainer = document.createElement('div');
    this.joystickContainer.id = 'joystickContainer';
    this.joystickContainer.style.position = 'absolute';
    this.joystickContainer.style.bottom = '20px';
    this.joystickContainer.style.left = '20px';
    this.joystickContainer.style.width = '120px';
    this.joystickContainer.style.height = '120px';
    this.joystickContainer.style.pointerEvents = 'auto';
    this.joystickContainer.style.zIndex = '20';
    this.uiContainer.appendChild(this.joystickContainer);
    
    // Create fire button for touch controls
    this.fireButton = document.createElement('div');
    this.fireButton.id = 'fireButton';
    this.fireButton.style.position = 'absolute';
    this.fireButton.style.bottom = '80px';
    this.fireButton.style.right = '20px';
    this.fireButton.style.width = '100px';
    this.fireButton.style.height = '60px';
    this.fireButton.style.borderRadius = '5px';
    this.fireButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    this.fireButton.style.border = '2px solid rgba(255, 0, 0, 0.8)';
    this.fireButton.style.display = 'flex';
    this.fireButton.style.justifyContent = 'center';
    this.fireButton.style.alignItems = 'center';
    this.fireButton.style.pointerEvents = 'auto';
    this.fireButton.style.zIndex = '20';
    this.fireButton.style.userSelect = 'none';
    this.fireButton.innerHTML = '🔥';
    this.fireButton.style.fontSize = '40px';
    this.uiContainer.appendChild(this.fireButton);

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
    
    // Create ammo bar container - positioned below health bar
    this.ammoBarContainer = document.createElement('div');
    this.healthBarContainer.appendChild(this.ammoBarContainer);
    
    // Create ammo bar outer container
    const ammoBarOuter = document.createElement('div');
    ammoBarOuter.className = 'progress';
    this.ammoBarContainer.appendChild(ammoBarOuter);
    
    // Create ammo bar
    this.ammoBarElement = document.createElement('div');
    this.ammoBarElement.id = 'ammoBar';
    this.ammoBarElement.style.backgroundColor = '#999'; // Grey color for ammo
    ammoBarOuter.appendChild(this.ammoBarElement);
    
    // Create ammo text
    this.ammoTextElement = document.createElement('div');
    this.ammoTextElement.className = 'percent';
    this.ammoTextElement.style.fontFamily = "'Courier Prime', monospace";
    this.ammoTextElement.style.fontWeight = "700";
    ammoBarOuter.appendChild(this.ammoTextElement);
    
    // Create wood bar container positioned below ammo bar
    this.woodBarContainer = document.createElement('div');
    this.healthBarContainer.appendChild(this.woodBarContainer);
    
    // Create wood bar outer container
    const woodBarOuter = document.createElement('div');
    woodBarOuter.className = 'progress';
    this.woodBarContainer.appendChild(woodBarOuter);
    
    // Create wood bar
    this.woodBarElement = document.createElement('div');
    this.woodBarElement.id = 'woodBar';
    this.woodBarElement.style.backgroundColor = '#4CAF50'; // Green color for wood
    woodBarOuter.appendChild(this.woodBarElement);
    
    // Create wood text
    this.woodTextElement = document.createElement('div');
    this.woodTextElement.className = 'percent';
    this.woodTextElement.style.fontFamily = "'Courier Prime', monospace";
    this.woodTextElement.style.fontWeight = "700";
    woodBarOuter.appendChild(this.woodTextElement);
    
    // Create context menu for tile selection
    this.contextMenu = document.createElement('div');
    this.contextMenu.style.position = 'absolute';
    this.contextMenu.style.display = 'none'; // Initially hidden
    this.contextMenu.style.zIndex = '200';
    this.contextMenu.style.pointerEvents = 'auto';
    this.uiContainer.appendChild(this.contextMenu);
    
    // Create build road context button
    this.buildRoadContextButton = document.createElement('div');
    this.buildRoadContextButton.className = 'context-menu-button';
    this.buildRoadContextButton.innerHTML = '🛣️'; // Road emoji
    this.buildRoadContextButton.title = 'Build Road';
    this.buildRoadContextButton.style.backgroundColor = '#4CAF50';
    this.buildRoadContextButton.onclick = () => this.gameScene.buildTile('road');
    this.contextMenu.appendChild(this.buildRoadContextButton);
    
    // Create build wall context button
    this.buildWallContextButton = document.createElement('div');
    this.buildWallContextButton.className = 'context-menu-button';
    this.buildWallContextButton.innerHTML = '🧱'; // Brick emoji
    this.buildWallContextButton.title = 'Build Wall';
    this.buildWallContextButton.style.backgroundColor = '#2196F3';
    this.buildWallContextButton.onclick = () => this.gameScene.buildTile('wall');
    this.contextMenu.appendChild(this.buildWallContextButton);
    
    // Create harvest wood context button
    this.harvestWoodContextButton = document.createElement('div');
    this.harvestWoodContextButton.className = 'context-menu-button';
    this.harvestWoodContextButton.innerHTML = '🪓'; // Axe emoji
    this.harvestWoodContextButton.title = 'Harvest Wood';
    this.harvestWoodContextButton.style.backgroundColor = '#8D6E63';
    this.harvestWoodContextButton.onclick = () => this.gameScene.buildTile('forest');
    this.contextMenu.appendChild(this.harvestWoodContextButton);
    
    // Add CSS class styling for context menu buttons
    const style = document.createElement('style');
    style.textContent = `
      .context-menu-button {
        width: 40px;
        height: 40px;
        border-radius: 5px;
        margin: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-size: 24px;
        color: white;
        border: 2px solid rgba(255,255,255,0.5);
        box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
        transition: transform 0.1s ease-in-out;
      }
      .context-menu-button:hover {
        transform: scale(1.1);
      }
      .context-menu-button:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
    
    // Create pillbox count display
    this.pillboxCountElement = document.createElement('div');
    this.pillboxCountElement.style.position = 'absolute';
    this.pillboxCountElement.style.top = '40px';
    this.pillboxCountElement.style.right = '20px';
    this.pillboxCountElement.style.padding = '5px 10px';
    this.pillboxCountElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.pillboxCountElement.style.color = 'white';
    this.pillboxCountElement.style.borderRadius = '5px';
    this.pillboxCountElement.style.fontFamily = "'Courier Prime', monospace";
    this.pillboxCountElement.style.fontWeight = "700";
    this.pillboxCountElement.textContent = 'Pillboxes: 0';
    this.uiContainer.appendChild(this.pillboxCountElement);
    
    // Create wood count display
    this.woodCountElement = document.createElement('div');
    this.woodCountElement.style.position = 'absolute';
    this.woodCountElement.style.top = '70px';
    this.woodCountElement.style.right = '20px';
    this.woodCountElement.style.padding = '5px 10px';
    this.woodCountElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.woodCountElement.style.color = 'white';
    this.woodCountElement.style.borderRadius = '5px';
    this.woodCountElement.style.fontFamily = "'Courier Prime', monospace";
    this.woodCountElement.style.fontWeight = "700";
    this.woodCountElement.textContent = 'Wood: 0';
    this.uiContainer.appendChild(this.woodCountElement);
    
    // Create harvest wood button (now hidden as we use the context menu)
    this.harvestWoodButton = document.createElement('button');
    this.harvestWoodButton.textContent = 'Harvest Wood';
    this.harvestWoodButton.style.position = 'absolute';
    this.harvestWoodButton.style.bottom = '100px';
    this.harvestWoodButton.style.right = '20px';
    this.harvestWoodButton.style.padding = '10px 20px';
    this.harvestWoodButton.style.backgroundColor = '#8D6E63'; // Brown color for wood
    this.harvestWoodButton.style.color = 'white';
    this.harvestWoodButton.style.border = 'none';
    this.harvestWoodButton.style.borderRadius = '5px';
    this.harvestWoodButton.style.cursor = 'pointer';
    this.harvestWoodButton.style.fontFamily = "'Courier Prime', monospace";
    this.harvestWoodButton.style.fontWeight = "700";
    this.harvestWoodButton.style.pointerEvents = 'auto';
    this.harvestWoodButton.style.display = 'none'; // Hide it as we use context menu instead
    this.harvestWoodButton.onclick = () => this.gameScene.buildTile('forest'); // Use forest tile type for harvesting
    this.uiContainer.appendChild(this.harvestWoodButton);
    
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

    // Create newswire container at the bottom of the screen
    this.newswireContainer = document.createElement('div');
    this.newswireContainer.id = 'newswireContainer';
    this.newswireContainer.style.position = 'absolute';
    this.newswireContainer.style.bottom = '0';
    this.newswireContainer.style.left = '0';
    this.newswireContainer.style.width = 'auto';
    this.newswireContainer.style.zIndex = '20';
    this.uiContainer.appendChild(this.newswireContainer);
    
    // Create newswire
    this.newswire = document.createElement('div');
    this.newswire.id = 'newswire';
    this.newswire.style.maxHeight = '34px'; // Default height when collapsed
    this.newswire.style.overflow = 'hidden';
    this.newswireContainer.appendChild(this.newswire);
    
    // Create newswire text container
    this.newswireText = document.createElement('div');
    this.newswireText.id = 'newswireText';
    this.newswire.appendChild(this.newswireText);
    
    // Create a container for the most recent message (shown when collapsed)
    this.recentMessageContainer = document.createElement('div');
    this.recentMessageContainer.id = 'recentMessageContainer';
    this.recentMessageContainer.style.display = 'block';
    this.newswire.appendChild(this.recentMessageContainer);
    
    // Create expand button
    this.newswireExpandButton = document.createElement('button');
    this.newswireExpandButton.id = 'newswireExpandButton';
    this.newswireExpandButton.textContent = '▼';
    this.newswireExpandButton.className = 'button';
    this.newswireExpandButton.style.pointerEvents = 'auto';
    this.newswireContainer.appendChild(this.newswireExpandButton);
    
    // Add click handler to expand/collapse the newswire
    this.newswireExpandButton.onclick = () => {
      this.isNewswireExpanded = !this.isNewswireExpanded;
      if (this.isNewswireExpanded) {
        this.newswire.classList.add('expanded');
        this.newswireExpandButton.textContent = '▲';
        // Show all messages
        this.newswireText.style.display = 'block';
        this.recentMessageContainer.style.display = 'none';
        // Make sure it's tall enough when expanded
        this.newswire.style.maxHeight = '300px';
        this.newswire.style.height = 'auto';
        this.newswire.style.minHeight = '200px';
        this.newswire.style.overflow = 'auto';
      } else {
        this.newswire.classList.remove('expanded');
        this.newswireExpandButton.textContent = '▼';
        // Only show most recent message
        this.newswireText.style.display = 'none';
        this.recentMessageContainer.style.display = 'block';
        // Reset height when collapsed
        this.newswire.style.maxHeight = '34px';
        this.newswire.style.height = '34px';
        this.newswire.style.minHeight = '';
        this.newswire.style.overflow = 'hidden';
      }
    };
    
    // Initially hide all messages except most recent
    this.newswireText.style.display = 'none';
    
    // Make sure scroll and resize work (needs pointer-events: auto)
    this.newswire.style.pointerEvents = 'auto';
    
    // Create chat container, will be shown/hidden as needed
    this.chatContainer = document.createElement('div');
    this.chatContainer.id = 'chatContainer';
    this.chatContainer.style.position = 'absolute';
    this.chatContainer.style.bottom = '36px'; // Position just above the newswire (34px + borders)
    this.chatContainer.style.left = '0';
    this.chatContainer.style.display = 'none'; // Initially hidden
    this.chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.chatContainer.style.padding = '5px';
    this.chatContainer.style.width = 'auto';
    this.chatContainer.style.pointerEvents = 'auto'; // Allow interaction
    this.chatContainer.style.zIndex = '20'; // Same z-index as newswire
    this.uiContainer.appendChild(this.chatContainer);
    
    // Create chat input field
    this.chatInput = document.createElement('input');
    this.chatInput.type = 'text';
    this.chatInput.className = 'chatInput';
    this.chatInput.placeholder = 'Team chat (Shift+Enter for all)';
    this.chatInput.maxLength = 100; // Limit message length
    this.chatInput.style.width = '300px';
    this.chatContainer.appendChild(this.chatInput);
    
    // Create chat button
    this.chatButton = document.createElement('button');
    this.chatButton.id = 'chatButton';
    this.chatButton.textContent = '💬';
    this.chatButton.className = 'button';
    this.chatButton.style.height = '28px';
    this.chatButton.style.marginLeft = '5px';
    this.chatContainer.appendChild(this.chatButton);
    
    // Create a chat icon button in the newswire container
    const chatIconButton = document.createElement('button');
    chatIconButton.id = 'newswireChatButton';
    chatIconButton.textContent = '💬';
    chatIconButton.className = 'button';
    chatIconButton.style.pointerEvents = 'auto';
    chatIconButton.style.height = '100%';
    chatIconButton.style.width = '34px';
    chatIconButton.style.padding = '0';
    this.newswireContainer.appendChild(chatIconButton);
    
    // Add keyboard event listener for Enter key to toggle chat
    document.addEventListener('keydown', (event) => {
      // Don't toggle if already in chat mode and pressing Enter to send
      if (event.key === 'Enter' && !this.isChatActive) {
        this.toggleChat();
        event.preventDefault();
      } else if (event.key === 'Escape' && this.isChatActive) {
        this.closeChat();
        event.preventDefault();
      } else if (event.key === 'Enter' && this.isChatActive) {
        this.sendChatMessage(event.shiftKey);
        event.preventDefault();
      }
    });
    
    // Add click handlers for chat buttons
    chatIconButton.onclick = () => this.toggleChat();
    this.chatButton.onclick = () => this.sendChatMessage(false);
    
    // Add blur handler to close chat when clicking outside
    this.chatInput.onblur = (e) => {
      // Small delay to allow button click to send message first
      setTimeout(() => {
        if (!this.chatContainer.contains(document.activeElement)) {
          this.closeChat();
        }
      }, 200);
    };

    // Create map status container for stations and pillboxes
    this.createMapStatusDisplay();
    
    // Update UI container position when window resizes
    window.addEventListener('resize', () => this.updateUIPosition());

    // Initial update
    this.updateHealthBar(100);
    this.updateAmmoBar(PHYSICS.TANK_MAX_AMMO, PHYSICS.TANK_MAX_AMMO);
    
    // Initialize the touch joystick
    this.initJoystick();
  }
  
  /**
   * Initialize the touch controls (joystick and fire button)
   */
  // Forward button for mobile controls
  private forwardButton: HTMLDivElement;
  
  private initJoystick(): void {
    // Only show touch controls on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isTouchDevice) {
      this.joystickContainer.style.display = 'none';
      this.fireButton.style.display = 'none';
      return;
    }
    
    // Create the forward button - positioned on the right side of the screen
    this.forwardButton = document.createElement('div');
    this.forwardButton.id = 'forwardButton';
    this.forwardButton.style.position = 'absolute';
    this.forwardButton.style.bottom = '150px'; // Position above fire button
    this.forwardButton.style.right = '20px';
    this.forwardButton.style.width = '100px';
    this.forwardButton.style.height = '60px';
    this.forwardButton.style.borderRadius = '5px';
    this.forwardButton.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
    this.forwardButton.style.border = '2px solid rgba(0, 255, 0, 0.8)';
    this.forwardButton.style.display = 'flex';
    this.forwardButton.style.justifyContent = 'center';
    this.forwardButton.style.alignItems = 'center';
    this.forwardButton.style.pointerEvents = 'auto';
    this.forwardButton.style.zIndex = '20';
    this.forwardButton.style.userSelect = 'none';
    this.forwardButton.innerHTML = '⬆️';
    this.forwardButton.style.fontSize = '40px';
    this.uiContainer.appendChild(this.forwardButton);
    
    // Create the nipplejs joystick
    this.joystickManager = nipplejs.create({
      zone: this.joystickContainer,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'rgba(255, 255, 255, 0.5)',
      size: 120,
      lockX: false,
      lockY: false
    });
    
    // Dead zone for turning calculations
    const DEAD_ZONE = 0.5;
    const HYSTERESIS = 0.5;
    
    // Add event listeners for joystick movements - now only controls turning
    this.joystickManager.on('move', (evt, data) => {
      if (!this.gameScene || !data || !data.vector) return;
      
      const { x, y } = data.vector;
      const angle = data.angle.radian;
      
      // Reset tank turning inputs
      this.gameScene.virtualInputs = {
        left: false,
        right: false,
        up: this.gameScene.virtualInputs.up,
        down: false
      };
      
      // Skip turning in the dead zone (when joystick is near center)
      const distance = Math.sqrt(x*x + y*y);
      if (distance < DEAD_ZONE) return;
      
      // Get the current tank heading in the game
      const tankHeading = this.gameScene.currentPlayer?.heading || 0;
      
      // Calculate the difference between joystick angle and tank heading
      // First convert joystick angle to same coordinate system as tank heading
      // In Phaser, heading 0 is to the right, increasing clockwise
      // In nipplejs, angle 0 is to the right, increasing counter-clockwise
      const joystickHeading = Math.PI * 2 - angle;
      
      // Find the smallest angle between the two directions
      let angleDiff = joystickHeading - tankHeading;
      
      // Normalize to -PI to PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Turn based on the angle difference
      if (angleDiff > HYSTERESIS) {
        // Turn right (clockwise)
        this.gameScene.virtualInputs.right = true;
      } else if (angleDiff < -HYSTERESIS) {
        // Turn left (counter-clockwise)
        this.gameScene.virtualInputs.left = true;
      }
    });
    
    // Reset inputs when joystick is released
    this.joystickManager.on('end', () => {
      if (!this.gameScene) return;
      
      // Only reset turning inputs, not forward
      this.gameScene.virtualInputs.left = false;
      this.gameScene.virtualInputs.right = false;
    });
    
    // Set up forward button events
    let isMovingForward = false;
    
    // Set active styles for visual feedback
    this.forwardButton.addEventListener('touchstart', (event) => {
      event.preventDefault(); // Prevent default to avoid scrolling
      if (!this.gameScene) return;
      
      isMovingForward = true;
      this.gameScene.virtualInputs.up = true;
      this.forwardButton.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
      this.forwardButton.style.transform = 'scale(0.95)';
    });
    
    this.forwardButton.addEventListener('touchend', (event) => {
      event.preventDefault();
      if (!this.gameScene) return;
      
      isMovingForward = false;
      this.gameScene.virtualInputs.up = false;
      this.forwardButton.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
      this.forwardButton.style.transform = 'scale(1)';
    });
    
    this.forwardButton.addEventListener('touchcancel', (event) => {
      event.preventDefault();
      if (!this.gameScene) return;
      
      isMovingForward = false;
      this.gameScene.virtualInputs.up = false;
      this.forwardButton.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
      this.forwardButton.style.transform = 'scale(1)';
    });
    
    // Handle the case where the finger moves out of the forward button
    document.addEventListener('touchmove', (event) => {
      if (!isMovingForward) return;
      
      // Check if any touch is still on the forward button
      let touchOnButton = false;
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        const rect = this.forwardButton.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          touchOnButton = true;
          break;
        }
      }
      
      // If no touches are on the button anymore, stop moving forward
      if (!touchOnButton && isMovingForward) {
        isMovingForward = false;
        this.gameScene.virtualInputs.up = false;
        this.forwardButton.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
        this.forwardButton.style.transform = 'scale(1)';
      }
    });
    
    // Set up fire button events
    let isFiring = false;
    
    // Set active styles for visual feedback
    this.fireButton.addEventListener('touchstart', (event) => {
      event.preventDefault(); // Prevent default to avoid scrolling
      if (!this.gameScene) return;
      
      isFiring = true;
      this.gameScene.virtualFiring = true;
      this.fireButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      this.fireButton.style.transform = 'scale(0.95)';
    });
    
    this.fireButton.addEventListener('touchend', (event) => {
      event.preventDefault();
      if (!this.gameScene) return;
      
      isFiring = false;
      this.gameScene.virtualFiring = false;
      this.fireButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
      this.fireButton.style.transform = 'scale(1)';
    });
    
    this.fireButton.addEventListener('touchcancel', (event) => {
      event.preventDefault();
      if (!this.gameScene) return;
      
      isFiring = false;
      this.gameScene.virtualFiring = false;
      this.fireButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
      this.fireButton.style.transform = 'scale(1)';
    });
    
    // Handle the case where the finger moves out of the fire button
    document.addEventListener('touchmove', (event) => {
      if (!isFiring) return;
      
      // Check if any touch is still on the fire button
      let touchOnButton = false;
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        const rect = this.fireButton.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          touchOnButton = true;
          break;
        }
      }
      
      // If no touches are on the button anymore, stop firing
      if (!touchOnButton && isFiring) {
        isFiring = false;
        this.gameScene.virtualFiring = false;
        this.fireButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        this.fireButton.style.transform = 'scale(1)';
      }
    });
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
    
    // Check if the forward button exists and update its visibility
    if (this.forwardButton) {
      // Make sure forward button is visible on touch devices
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.forwardButton.style.display = isTouchDevice ? 'flex' : 'none';
    }
    
    // Update joystick position if it exists (handle orientation changes)
    if (this.joystickManager && this.joystickManager.get().length > 0) {
      // Dead zone for turning calculations
      const DEAD_ZONE = 0.2;
      
      // Destroy and recreate the joystick to ensure proper positioning
      this.joystickManager.destroy();
      this.joystickManager = nipplejs.create({
        zone: this.joystickContainer,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'rgba(255, 255, 255, 0.5)',
        size: 120,
        lockX: false,
        lockY: false
      });
      
      // Re-add event listeners for joystick movements - now only controls turning
      this.joystickManager.on('move', (evt, data) => {
        if (!this.gameScene || !data || !data.vector) return;
        
        const { x, y } = data.vector;
        const angle = data.angle.radian;
        
        // Reset tank turning inputs
        const forwardState = this.gameScene.virtualInputs.up;
        this.gameScene.virtualInputs = {
          left: false,
          right: false,
          up: forwardState, // Preserve forward state
          down: false
        };
        
        // Skip turning in the dead zone (when joystick is near center)
        const distance = Math.sqrt(x*x + y*y);
        if (distance < DEAD_ZONE) return;
        
        // Get the current tank heading in the game
        const tankHeading = this.gameScene.currentPlayer?.heading || 0;
        
        // Calculate the difference between joystick angle and tank heading
        // First convert joystick angle to same coordinate system as tank heading
        // In Phaser, heading 0 is to the right, increasing clockwise
        // In nipplejs, angle 0 is to the right, increasing counter-clockwise
        const joystickHeading = Math.PI * 2 - angle;
        
        // Find the smallest angle between the two directions
        let angleDiff = joystickHeading - tankHeading;
        
        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Turn based on the angle difference
        if (angleDiff > DEAD_ZONE) {
          // Turn right (clockwise)
          this.gameScene.virtualInputs.right = true;
        } else if (angleDiff < -DEAD_ZONE) {
          // Turn left (counter-clockwise)
          this.gameScene.virtualInputs.left = true;
        }
      });
      
      // Reset inputs when joystick is released
      this.joystickManager.on('end', () => {
        if (!this.gameScene) return;
        
        // Only reset turning inputs, not forward
        const forwardState = this.gameScene.virtualInputs.up;
        this.gameScene.virtualInputs = {
          left: false,
          right: false,
          up: forwardState, // Preserve forward state
          down: false
        };
      });
    }
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
   * Updates the ammo bar with the current player's ammunition
   */
  public updateAmmoBar(currentAmmo: number, maxAmmo: number) {
    if (!this.ammoBarElement || !this.ammoTextElement) return;
    
    // Calculate percentage
    const ammoPercentage = Math.floor((currentAmmo / maxAmmo) * 100);
    
    // Update ammo bar width
    this.ammoBarElement.style.width = `${ammoPercentage}%`;
    
    // Update ammo text
    this.ammoTextElement.textContent = `Ammo:\u00A0${Math.floor(currentAmmo)}/${maxAmmo}`;
    
    // Change color based on ammo level
    if (ammoPercentage < 25) {
      this.ammoBarElement.style.backgroundColor = '#cc3333'; // Red when low
    } else if (ammoPercentage < 50) {
      this.ammoBarElement.style.backgroundColor = '#cc9933'; // Orange when medium
    } else {
      this.ammoBarElement.style.backgroundColor = '#999999'; // Grey when high
    }
  }
  
  /**
   * Updates the wood bar with the current player's wood resources
   */
  public updateWoodBar(currentWood: number, maxWood: number) {
    if (!this.woodBarElement || !this.woodTextElement) return;
    
    // Calculate percentage
    const woodPercentage = Math.floor((currentWood / maxWood) * 100);
    
    // Update wood bar width
    this.woodBarElement.style.width = `${woodPercentage}%`;
    
    // Update wood text
    this.woodTextElement.textContent = `Wood:\u00A0${Math.floor(currentWood)}/${maxWood}`;
  }

  /**
   * Updates the pillbox count display
   */
  public updatePillboxCount(count: number) {
    if (!this.pillboxCountElement) return;
    
    this.pillboxCountElement.textContent = `Pillboxes: ${count}`;
  }
  
  /**
   * Updates the wood count display
   */
  public updateWoodCount(count: number) {
    if (!this.woodCountElement) return;
    
    this.woodCountElement.textContent = `Wood: ${count}`;
  }

  /**
   * Creates the map status display container showing stations and pillboxes
   */
  private createMapStatusDisplay() {
    // Create main container
    this.mapStatusContainer = document.createElement('div');
    this.mapStatusContainer.id = 'mapStatusContainer';
    this.uiContainer.appendChild(this.mapStatusContainer);
    
    // Create station row
    const stationRow = document.createElement('div');
    stationRow.className = 'entity-row';
    this.mapStatusContainer.appendChild(stationRow);
    
    // Create 16 station icons
    for (let i = 0; i < 16; i++) {
      const stationIcon = document.createElement('div');
      stationIcon.className = 'entity-icon station neutral';
      stationIcon.setAttribute('data-index', i.toString());
      stationIcon.title = `Station ${i + 1}`;
      stationRow.appendChild(stationIcon);
      this.stationIcons.push(stationIcon);
    }
    
    // Create pillbox row
    const pillboxRow = document.createElement('div');
    pillboxRow.className = 'entity-row';
    this.mapStatusContainer.appendChild(pillboxRow);
    
    // Create 16 pillbox icons
    for (let i = 0; i < 16; i++) {
      const pillboxIcon = document.createElement('div');
      pillboxIcon.className = 'entity-icon pillbox neutral';
      pillboxIcon.setAttribute('data-index', i.toString());
      pillboxIcon.title = `Pillbox ${i + 1}`;
      pillboxRow.appendChild(pillboxIcon);
      this.pillboxIcons.push(pillboxIcon);
    }
  }
  
  /**
   * Updates the map status display with current stations and pillboxes
   */
  private updateMapStatusDisplay() {
    // Only update if game scene is available and has loaded stations and pillboxes
    if (!this.gameScene || !this.gameScene.gameMap) return;
    
    // Reset all icons to neutral first
    this.stationIcons.forEach(icon => {
      icon.className = 'entity-icon station neutral';
    });
    this.pillboxIcons.forEach(icon => {
      icon.className = 'entity-icon pillbox neutral';
    });
    
    // Update stations (if available in game scene)
    if (this.gameScene.stations && this.gameScene.stations.length > 0) {
      // For each station in the game, update its corresponding icon
      this.gameScene.stations.forEach((station, index) => {
        if (index < this.stationIcons.length) {
          // Clear previous classes except base classes
          this.stationIcons[index].className = 'entity-icon station';
          
          // Set team color based on station's team
          if (station.team === 0) {
            this.stationIcons[index].classList.add('neutral');
          } else if (station.team === 1) {
            this.stationIcons[index].classList.add('team0');
          } else {
            this.stationIcons[index].classList.add('team1');
          }
          
          // Update tooltip with additional info if available
          this.stationIcons[index].title = `Station ${index + 1}: ${
            station.team === 0 ? 'Red Team' : 
            station.team === 1 ? 'Blue Team' : 
            'Neutral'
          }`;
        }
      });
    }
    
    // Update pillboxes (if available in game scene)
    if (this.gameScene.pillboxes && this.gameScene.pillboxes.length > 0) {
      // For each pillbox in the game, update its corresponding icon
      this.gameScene.pillboxes.forEach((pillbox, index) => {
        if (index < this.pillboxIcons.length) {
          // Clear previous classes except base classes
          this.pillboxIcons[index].className = 'entity-icon pillbox';
          
          // Set team color based on pillbox's team
          if (pillbox.team === 0) {
            this.pillboxIcons[index].classList.add('neutral');
          } else if (pillbox.team === 1) {
            this.pillboxIcons[index].classList.add('team0');
          } else {
            this.pillboxIcons[index].classList.add('team1');
          }
          
          // Update tooltip with additional info if available
          this.pillboxIcons[index].title = `Pillbox ${index + 1}: ${
            pillbox.team === 0 ? 'Red Team' : 
            pillbox.team === 1 ? 'Blue Team' : 
            'Neutral'
          }`;
        }
      });
    }
    
    // Fill in any missing icons with a count of active entities
    const stationCount = this.gameScene.stations ? this.gameScene.stations.length : 0;
    const pillboxCount = this.gameScene.pillboxes ? this.gameScene.pillboxes.length : 0;
    
    // Update the container title to show entity counts
    this.mapStatusContainer.title = `Stations: ${stationCount}/16, Pillboxes: ${pillboxCount}/16`;
  }
  
  /**
   * Updates the UI based on the current game state
   */
  public update() {
    if (this.gameScene.currentPlayer) {
      this.updateHealthBar(this.gameScene.currentPlayer.health);
      this.updateAmmoBar(this.gameScene.currentPlayer.ammo, PHYSICS.TANK_MAX_AMMO);
      this.updateWoodBar(this.gameScene.currentPlayer.wood, PHYSICS.TANK_MAX_WOOD);
      this.updatePillboxCount(this.gameScene.currentPlayer.pillboxCount);
      this.updateWoodCount(this.gameScene.currentPlayer.wood);
      
      // Update map status display if needed
      this.updateMapStatusDisplay();
    }
    
    // Update build buttons based on building state
    if (this.gameScene.isBuilding) {
      this.contextMenu.style.display = 'none';
    } else {
      // Show/hide context menu based on selection
      const hasSelection = this.gameScene.selectedTiles.length > 0;
      const hasPillboxes = this.gameScene.currentPlayer && this.gameScene.currentPlayer.pillboxCount > 0;
      
      let isValidSelection = false;
      let isInRange = false;
      
      if (hasSelection && !this.gameScene.isBuilding) {
        // Show context menu near the selection
        this.contextMenu.style.display = 'flex';
        
        // Since we know it's a 2x2 selection, we can calculate the center directly
        // Get the top-left tile of the selection
        const minX = Math.min(...this.gameScene.selectedTiles.map(t => t.x));
        const minY = Math.min(...this.gameScene.selectedTiles.map(t => t.y));
        
        // Get world position of the top-left tile
        const topLeftPos = this.gameScene.gameMap.groundLayer.tileToWorldXY(minX, minY);
        
        // Calculate center of the 2x2 selection (32 is tile size)
        const centerX = topLeftPos.x + 32;
        const centerY = topLeftPos.y + 32;
        
        // Convert to screen coordinates
        const camera = this.gameScene.cameras.main;
        const screenX = centerX - camera.scrollX;
        const screenY = centerY - camera.scrollY;
        
        // Position context menu near selection but ensure it stays on screen
        const menuWidth = 150; // Approximate width of context menu
        const menuHeight = 50; // Approximate height of context menu
        const padding = 10; // Padding from selection
        
        // Position above the selection if possible, otherwise below
        let menuX = screenX - menuWidth / 2 - 16;
        let menuY = screenY - menuHeight - padding - 32;
        
        // Keep menu on screen
        menuX = Math.max(padding, Math.min(window.innerWidth - menuWidth - padding, menuX));
        
        // If menu would go off the top of the screen, position it below the selection
        if (menuY < padding) {
          menuY = screenY + 32 + padding; // 32 is tile height
        }
        
        this.contextMenu.style.left = `${menuX}px`;
        this.contextMenu.style.top = `${menuY}px`;

        // Check if player is close enough to the selection
        if (this.gameScene.currentPlayer) {
          // Find the center of the 2x2 selection
          const minX = Math.min(...this.gameScene.selectedTiles.map(t => t.x));
          const minY = Math.min(...this.gameScene.selectedTiles.map(t => t.y));
          const worldPos = this.gameScene.gameMap.groundLayer.tileToWorldXY(minX, minY);
          const centerX = worldPos.x + 16; // Center of the 2x2 area
          const centerY = worldPos.y + 16;
          
          // Calculate distance
          const distance = Phaser.Math.Distance.Between(
            this.gameScene.currentPlayer.x, this.gameScene.currentPlayer.y,
            centerX, centerY
          );
          
          // Check if close enough (using the same distance as in placePillbox)
          isInRange = distance <= PHYSICS.BUILD_MAX_DISTANCE;
        }
        
        // Check if selected tiles are valid for each button type
        // First, check if any of the selected tiles are walls (can't build wall or road on a wall)
        let nWallTiles = 0;
        let nForestTiles = 0;
        
        for (const tile of this.gameScene.selectedTiles) {
          const groundTile = this.gameScene.gameMap.groundLayer.getTileAt(tile.x, tile.y);
          const decorationTile = this.gameScene.gameMap.decorationLayer.getTileAt(tile.x, tile.y);
          
          // Check for wall tiles (which have collision)
          if (groundTile && groundTile.properties?.hasCollision) {
            nWallTiles++;
          }
          if (decorationTile && decorationTile.properties?.hasCollision) {
            nWallTiles++;
          }
          
          // Check for forest tiles (which have baseTileType of forest)
          if (decorationTile && this.gameScene.gameMap.getBaseTileType(decorationTile) === TILE_INDICES.FOREST) { // 2*64 = 128 for forest
            nForestTiles++;
          }
        }
        
        // Update build road button state
        if (!isInRange || nWallTiles == 4) {
          this.buildRoadContextButton.style.opacity = '0.5';
          this.buildRoadContextButton.style.cursor = 'not-allowed';
          this.buildRoadContextButton.style.backgroundColor = '#888888'; // Grey
          this.buildRoadContextButton.onclick = null; // Remove click handler when disabled
          this.buildRoadContextButton.title = "Can't build road on a wall";
        } else {
          isValidSelection = true;
          this.buildRoadContextButton.style.opacity = '1';
          this.buildRoadContextButton.style.cursor = 'pointer';
          this.buildRoadContextButton.style.backgroundColor = '#4CAF50'; // Green
          this.buildRoadContextButton.onclick = () => this.gameScene.buildTile('road');
          this.buildRoadContextButton.title = "Build Road";
        }
        
        // Update build wall button state
        if (!isInRange || nWallTiles == 4) {
          this.buildWallContextButton.style.opacity = '0.5';
          this.buildWallContextButton.style.cursor = 'not-allowed';
          this.buildWallContextButton.style.backgroundColor = '#888888'; // Grey
          this.buildWallContextButton.onclick = null; // Remove click handler when disabled
          this.buildWallContextButton.title = "Can't build wall on a wall";
        } else {
          isValidSelection = true;
          this.buildWallContextButton.style.opacity = '1';
          this.buildWallContextButton.style.cursor = 'pointer';
          this.buildWallContextButton.style.backgroundColor = '#2196F3'; // Blue
          this.buildWallContextButton.onclick = () => this.gameScene.buildTile('wall');
          this.buildWallContextButton.title = "Build Wall";
        }
        
        // Update harvest wood button state
        if (!isInRange || nForestTiles == 0) {
          this.harvestWoodContextButton.style.opacity = '0.5';
          this.harvestWoodContextButton.style.cursor = 'not-allowed';
          this.harvestWoodContextButton.style.backgroundColor = '#888888'; // Grey
          this.harvestWoodContextButton.onclick = null; // Remove click handler when disabled
          this.harvestWoodContextButton.title = "No forest to harvest";
        } else {
          isValidSelection = true;
          this.harvestWoodContextButton.style.opacity = '1';
          this.harvestWoodContextButton.style.cursor = 'pointer';
          this.harvestWoodContextButton.style.backgroundColor = '#8D6E63'; // Brown
          this.harvestWoodContextButton.onclick = () => this.gameScene.buildTile('forest');
          this.harvestWoodContextButton.title = "Harvest Wood";
        }
      } else {
        this.contextMenu.style.display = 'none';
      }

      if (hasPillboxes) {
        isValidSelection = (this.gameScene.gameMap as any).isSelectionValidForPillbox(this.gameScene.selectedTiles);
        
        // Since we always have a 2x2 selection, we can just add a dynamic pillbox button
        // Create pillbox context button if it doesn't exist yet
        if (!this.contextMenu.querySelector('.pillbox-button') && hasPillboxes) {
          const pillboxContextButton = document.createElement('div');
          pillboxContextButton.className = 'context-menu-button pillbox-button';
          pillboxContextButton.innerHTML = '🛡️'; // Shield emoji for pillbox
          pillboxContextButton.title = 'Place Pillbox';
          pillboxContextButton.style.backgroundColor = '#9c27b0'; // Purple
          pillboxContextButton.onclick = () => this.gameScene.placePillbox();
          this.contextMenu.appendChild(pillboxContextButton);
        }
        
        // Handle the button state based on validity and range
        const pillboxButton = this.contextMenu.querySelector('.pillbox-button');
        if (pillboxButton) {
          if (!hasPillboxes) {
            // Remove the button if no pillboxes available
            this.contextMenu.removeChild(pillboxButton);
          } else if (!isValidSelection || !isInRange) {
            // Disable the button if selection invalid or out of range
            pillboxButton.style.opacity = '0.5';
            pillboxButton.style.cursor = 'not-allowed';
            pillboxButton.style.backgroundColor = '#888888'; // Grey
            pillboxButton.onclick = null; // Remove click handler when disabled
            
            // Update tooltip to explain why it's disabled
            if (!isValidSelection) {
              pillboxButton.title = "Invalid selection. Need valid land for pillbox.";
            } else if (!isInRange) {
              pillboxButton.title = "Too far away. Move closer to place pillbox.";
            }
          } else {
            // Enable the button when valid and in range
            pillboxButton.style.opacity = '1';
            pillboxButton.style.cursor = 'pointer';
            pillboxButton.style.backgroundColor = '#9c27b0'; // Purple
            pillboxButton.onclick = () => this.gameScene.placePillbox();
            pillboxButton.title = 'Place Pillbox';
          }
        }
      } else {
        // Remove pillbox button from context menu if it exists
        const pillboxButton = this.contextMenu.querySelector('.pillbox-button');
        if (pillboxButton) {
          this.contextMenu.removeChild(pillboxButton);
        }
      }
    
      // Also pass range information to the selection renderer
      if (this.gameScene.selectionRect && hasSelection) {
        if (!isInRange) {
          // Selection is valid but out of range - color it grey
          this.gameScene.selectionRect.setStrokeStyle(2, 0x888888);
          this.gameScene.selectionRect.setFillStyle(0x888888, 0.3);
        } else if (isValidSelection && isInRange) {
          // Selection is valid and in range - color it green
          this.gameScene.selectionRect.setStrokeStyle(2, 0x00ff00);
          this.gameScene.selectionRect.setFillStyle(0x00ff00, 0.3);
        } else {
          // Selection is invalid - color it red
          this.gameScene.selectionRect.setStrokeStyle(2, 0xff0000);
          this.gameScene.selectionRect.setFillStyle(0xff0000, 0.3);
        }
      }
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
  
  /**
   * Adds a message to the newswire
   * @param message The message to add to the newswire
   * @param type Optional type for styling (info, warning, error, success)
   */
  public addNewswireMessage(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    // Create a message element
    const messageElement = document.createElement('div');
    messageElement.className = `newswire-message ${type}`;
    messageElement.textContent = message;
    
    // Add to the main newswire text container (shown when expanded)
    this.newswireText.prepend(messageElement);
    
    // Update the recent message container with a clone of the newest message
    this.updateRecentMessage(message, type);
  
    // Limit the number of messages
    while (this.newswireText.children.length > this.maxNewswireMessages) {
      // Remove oldest message (last child)
      this.newswireText.removeChild(this.newswireText.lastChild);
    }
  }
  
  /**
   * Updates the recent message container with the newest message
   * @param message The message text
   * @param type The message type for styling
   */
  private updateRecentMessage(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    // Clear previous recent message
    this.recentMessageContainer.innerHTML = '';
    
    // Create a new message element for the recent container
    const recentMessage = document.createElement('div');
    recentMessage.className = `newswire-message ${type}`;
    recentMessage.textContent = message;
    
    // Add to recent message container
    this.recentMessageContainer.appendChild(recentMessage);
  }
  
  /**
   * Clears all messages from the newswire
   */
  public clearNewswire() {
    this.newswireText.innerHTML = '';
    this.recentMessageContainer.innerHTML = '';
  }
  
  /**
   * Toggles the chat input visibility
   */
  public toggleChat() {
    this.isChatActive = !this.isChatActive;
    this.chatContainer.style.display = this.isChatActive ? 'flex' : 'none';
    
    if (this.isChatActive) {
      // Focus the input field when opening
      this.chatInput.focus();
      
      // Ensure newswire is expanded when chat is active
      if (!this.isNewswireExpanded) {
        this.isNewswireExpanded = true;
        this.newswire.classList.add('expanded');
        this.newswireExpandButton.textContent = '▲';
      }
    }
  }
  
  /**
   * Returns whether chat is currently active
   */
  public isChatActive(): boolean {
    return this.isChatActive;
  }
  
  /**
   * Closes the chat input
   */
  public closeChat() {
    this.isChatActive = false;
    this.chatContainer.style.display = 'none';
    // Clear input when closing
    this.chatInput.value = '';
  }
  
  /**
   * Sends a chat message to the server
   * @param isAllChat Whether the message should be sent to all players or just team
   */
  public sendChatMessage(isAllChat: boolean) {
    const messageText = this.chatInput.value.trim();
    if (messageText.length === 0) {
      this.closeChat();
      return;
    }
    
    // Check for /all prefix overriding the isAllChat parameter
    let finalIsAllChat = isAllChat;
    let finalMessageText = messageText;
    
    if (messageText.startsWith('/all ')) {
      finalIsAllChat = true;
      finalMessageText = messageText.substring(5).trim();
    }
    
    if (finalMessageText.length === 0) {
      this.closeChat();
      return;
    }
    
    // Send message to server
    this.gameScene.room.send("chatMessage", {
      message: finalMessageText,
      isAllChat: finalIsAllChat
    });
    
    // Clear input after sending
    this.chatInput.value = '';
    this.closeChat();
  }
  
  /**
   * Adds a chat message to the newswire
   * @param message The message content
   * @param playerName The name/id of the player who sent the message
   * @param isTeamChat Whether this is a team-only message
   * @param team The team number of the sender
   */
  public addChatMessage(message: string, playerName: string, isTeamChat: boolean, team: number) {
    // Create a message element
    const messageElement = document.createElement('div');
    messageElement.className = `newswire-message chat-message`;
    
    // Create prefix element (Team) or (All) with appropriate color
    const prefixElement = document.createElement('span');
    if (isTeamChat) {
      prefixElement.textContent = '(Team) ';
      prefixElement.style.color = '#ffcc00'; // Yellow for team chat
    } else {
      prefixElement.textContent = '(All) ';
      prefixElement.style.color = '#ff3333'; // Red for all chat
    }
    
    // Create player name element
    const playerNameElement = document.createElement('span');
    playerNameElement.textContent = playerName + ': ';
    
    // Set player name color based on team
    if (team === 1) { // Blue team
      playerNameElement.style.color = '#3333ff';
    } else { // Red team
      playerNameElement.style.color = '#ff3333';
    }
    
    // Create message content element
    const messageContentElement = document.createElement('span');
    messageContentElement.textContent = message;
    messageContentElement.style.color = '#ffffff';
    
    // Add all parts to the message element
    messageElement.appendChild(prefixElement);
    messageElement.appendChild(playerNameElement);
    messageElement.appendChild(messageContentElement);
    
    // Add to newswire at the beginning (newest messages at the top)
    this.newswireText.insertBefore(messageElement, this.newswireText.firstChild);
    
    // Update the recent message container as well
    this.updateRecentChatMessage(message, playerName, isTeamChat, team);
    
    // Limit the number of messages
    while (this.newswireText.children.length > this.maxNewswireMessages) {
      // Remove oldest message (last child)
      this.newswireText.removeChild(this.newswireText.lastChild);
    }
  }
  
  /**
   * Updates the recent message container with a chat message
   */
  private updateRecentChatMessage(message: string, playerName: string, isTeamChat: boolean, team: number) {
    // Clear previous recent message
    this.recentMessageContainer.innerHTML = '';
    
    // Create a new message element for the recent container
    const recentMessage = document.createElement('div');
    recentMessage.className = `newswire-message chat-message`;
    
    // Create prefix element (Team) or (All) with appropriate color
    const prefixElement = document.createElement('span');
    if (isTeamChat) {
      prefixElement.textContent = '(Team) ';
      prefixElement.style.color = '#ffcc00'; // Yellow for team chat
    } else {
      prefixElement.textContent = '(All) ';
      prefixElement.style.color = '#ff3333'; // Red for all chat
    }
    
    // Create player name element
    const playerNameElement = document.createElement('span');
    playerNameElement.textContent = playerName + ': ';
    
    // Set player name color based on team
    if (team === 1) { // Blue team
      playerNameElement.style.color = '#3333ff';
    } else { // Red team
      playerNameElement.style.color = '#ff3333';
    }
    
    // Create message content element
    const messageContentElement = document.createElement('span');
    messageContentElement.textContent = message;
    messageContentElement.style.color = '#ffffff';
    
    // Add all parts to the message element
    recentMessage.appendChild(prefixElement);
    recentMessage.appendChild(playerNameElement);
    recentMessage.appendChild(messageContentElement);
    
    // Add to recent message container
    this.recentMessageContainer.appendChild(recentMessage);
  }
}

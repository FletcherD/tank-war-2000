import { ClientGameScene } from "./scenes/ClientGameScene";
import { PHYSICS } from "../../shared/constants";

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
  private newswireExpandButton: HTMLButtonElement;
  private isNewswireExpanded: boolean = false;
  private maxNewswireMessages: number = 20;
  
  // Chat elements
  private chatContainer: HTMLDivElement;
  private chatInput: HTMLInputElement;
  private chatButton: HTMLButtonElement;
  private isChatActive: boolean = false;

  constructor(gameScene: ClientGameScene) {
    this.gameScene = gameScene;
    this.createUI();
  }

  private ammoBarContainer: HTMLDivElement;
  private ammoBarElement: HTMLDivElement;
  private ammoTextElement: HTMLDivElement;

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
    this.buildButton.onclick = () => this.gameScene.buildTile('road');
    this.uiContainer.appendChild(this.buildButton);
    
    // Create Build Wall button
    this.buildWallButton = document.createElement('button');
    this.buildWallButton.textContent = 'Build Wall';
    this.buildWallButton.style.position = 'absolute';
    this.buildWallButton.style.bottom = '20px';
    this.buildWallButton.style.right = '125px'; // Position to the left of Build Road button
    this.buildWallButton.style.padding = '10px 20px';
    this.buildWallButton.style.backgroundColor = '#2196F3'; // Blue color for wall button
    this.buildWallButton.style.color = 'white';
    this.buildWallButton.style.border = 'none';
    this.buildWallButton.style.borderRadius = '5px';
    this.buildWallButton.style.cursor = 'pointer';
    this.buildWallButton.style.fontFamily = "'Courier Prime', monospace";
    this.buildWallButton.style.fontWeight = "700";
    this.buildWallButton.style.pointerEvents = 'auto'; // Allow button clicks
    this.buildWallButton.onclick = () => this.gameScene.buildTile('wall');
    this.uiContainer.appendChild(this.buildWallButton);
    
    // Create Cancel Build button (initially hidden)
    this.cancelBuildButton = document.createElement('button');
    this.cancelBuildButton.textContent = 'Cancel Build';
    this.cancelBuildButton.style.position = 'absolute';
    this.cancelBuildButton.style.bottom = '20px';
    this.cancelBuildButton.style.right = '230px'; // Position to the left of other build buttons
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
    
    // Create place pillbox button
    this.placePillboxButton = document.createElement('button');
    this.placePillboxButton.textContent = 'Place Pillbox';
    this.placePillboxButton.style.position = 'absolute';
    this.placePillboxButton.style.bottom = '60px'; // Position above build button
    this.placePillboxButton.style.right = '20px';
    this.placePillboxButton.style.padding = '10px 20px';
    this.placePillboxButton.style.backgroundColor = '#9c27b0'; // Purple
    this.placePillboxButton.style.color = 'white';
    this.placePillboxButton.style.border = 'none';
    this.placePillboxButton.style.borderRadius = '5px';
    this.placePillboxButton.style.cursor = 'pointer';
    this.placePillboxButton.style.fontFamily = "'Courier Prime', monospace";
    this.placePillboxButton.style.fontWeight = "700";
    this.placePillboxButton.style.pointerEvents = 'auto';
    this.placePillboxButton.style.display = 'none'; // Initially hidden until player has pillboxes
    this.placePillboxButton.onclick = () => this.gameScene.placePillbox();
    this.uiContainer.appendChild(this.placePillboxButton);
    
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
    
    // Create harvest wood button
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
    this.uiContainer.appendChild(this.newswireContainer);
    
    // Create newswire
    this.newswire = document.createElement('div');
    this.newswire.id = 'newswire';
    this.newswireContainer.appendChild(this.newswire);
    
    // Create newswire text container
    this.newswireText = document.createElement('div');
    this.newswireText.id = 'newswireText';
    this.newswire.appendChild(this.newswireText);
    
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
      } else {
        this.newswire.classList.remove('expanded');
        this.newswireExpandButton.textContent = '▼';
      }
    };
    
    // Make sure scroll and resize work (needs pointer-events: auto)
    this.newswire.style.pointerEvents = 'auto';
    
    // Create chat container, will be shown/hidden as needed
    this.chatContainer = document.createElement('div');
    this.chatContainer.id = 'chatContainer';
    this.chatContainer.style.position = 'absolute';
    this.chatContainer.style.bottom = '34px'; // Position just above the newswire
    this.chatContainer.style.left = '0';
    this.chatContainer.style.display = 'none'; // Initially hidden
    this.chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.chatContainer.style.padding = '5px';
    this.chatContainer.style.width = 'auto';
    this.chatContainer.style.pointerEvents = 'auto'; // Allow interaction
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

    // Update UI container position when window resizes
    window.addEventListener('resize', () => this.updateUIPosition());

    // Initial update
    this.updateHealthBar(100);
    this.updateAmmoBar(PHYSICS.TANK_MAX_AMMO, PHYSICS.TANK_MAX_AMMO);
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
   * Updates the pillbox count display
   */
  public updatePillboxCount(count: number) {
    if (!this.pillboxCountElement) return;
    
    this.pillboxCountElement.textContent = `Pillboxes: ${count}`;
    
    // Show/hide the place pillbox button based on count
    if (count > 0) {
      this.placePillboxButton.style.display = 'block';
    } else {
      this.placePillboxButton.style.display = 'none';
    }
  }
  
  /**
   * Updates the wood count display
   */
  public updateWoodCount(count: number) {
    if (!this.woodCountElement) return;
    
    this.woodCountElement.textContent = `Wood: ${count}`;
  }

  /**
   * Updates the UI based on the current game state
   */
  public update() {
    if (this.gameScene.currentPlayer) {
      this.updateHealthBar(this.gameScene.currentPlayer.health);
      this.updateAmmoBar(this.gameScene.currentPlayer.ammo, PHYSICS.TANK_MAX_AMMO);
      this.updatePillboxCount(this.gameScene.currentPlayer.pillboxCount);
      this.updateWoodCount(this.gameScene.currentPlayer.wood);
    }
    
    // Update build buttons based on building state
    if (this.gameScene.isBuilding) {
      this.buildButton.style.display = 'none';
      this.buildWallButton.style.display = 'none';
      this.cancelBuildButton.style.display = 'block';
    } else {
      this.buildButton.style.display = 'block';
      this.buildWallButton.style.display = 'block';
      this.cancelBuildButton.style.display = 'none';
    }
    
    // Update place pillbox button visibility based on selection
    const hasSelection = this.gameScene.selectedTiles.length > 0;
    const hasPillboxes = this.gameScene.currentPlayer && this.gameScene.currentPlayer.pillboxCount > 0;
    
    // Check if the selection is valid for a pillbox (2x2 area of valid tiles)
    let isValidSelection = false;
    let isInRange = false;
    
    if (hasSelection && hasPillboxes && !this.gameScene.isBuilding) {
      isValidSelection = (this.gameScene.gameMap as any).isSelectionValidForPillbox(this.gameScene.selectedTiles);
      
      // Check if player is close enough to the selection
      if (isValidSelection && this.gameScene.currentPlayer) {
        // Find the center of the 2x2 selection
        const minX = Math.min(...this.gameScene.selectedTiles.map(t => t.x));
        const minY = Math.min(...this.gameScene.selectedTiles.map(t => t.y));
        const worldPos = this.gameScene.gameMap.groundLayer.tileToWorldXY(minX, minY);
        const centerX = worldPos.x + 32; // Center of the 2x2 area
        const centerY = worldPos.y + 32;
        
        // Calculate distance
        const distance = Phaser.Math.Distance.Between(
          this.gameScene.currentPlayer.x, this.gameScene.currentPlayer.y,
          centerX, centerY
        );
        
        // Check if close enough (using the same distance as in placePillbox)
        isInRange = distance <= 100;
      }
      
      // Show button but make it disabled if selection is invalid or too far
      this.placePillboxButton.style.display = 'block';
      
      if (isValidSelection && isInRange) {
        // Selection is valid and in range - enable button
        this.placePillboxButton.style.backgroundColor = '#9c27b0'; // Purple
        this.placePillboxButton.style.opacity = '1';
        this.placePillboxButton.style.cursor = 'pointer';
        this.placePillboxButton.disabled = false;
      } else {
        // Grey out button if selection is invalid or too far
        this.placePillboxButton.style.backgroundColor = '#888888'; // Grey
        this.placePillboxButton.style.opacity = '0.6';
        this.placePillboxButton.style.cursor = 'not-allowed';
        this.placePillboxButton.disabled = true;
        
        // Update the tooltip/title to explain why it's disabled
        if (!isValidSelection) {
          this.placePillboxButton.title = "Invalid selection. Need 2x2 area of valid land.";
        } else if (!isInRange) {
          this.placePillboxButton.title = "Too far away. Move closer to the selected area.";
        }
      }
    } else if (!hasSelection || this.gameScene.isBuilding) {
      this.placePillboxButton.style.display = 'none';
    }
    
    // Also pass range information to the selection renderer
    if (this.gameScene.selectionRect && hasSelection) {
      if (!isInRange && isValidSelection) {
        // Selection is valid but out of range - color it grey
        this.gameScene.selectionRect.setStrokeStyle(2, 0x888888);
        this.gameScene.selectionRect.setFillStyle(0x888888, 0.3);
      } else if (isValidSelection && isInRange) {
        // Selection is valid and in range - color it green
        this.gameScene.selectionRect.setStrokeStyle(2, 0x00ff00);
        this.gameScene.selectionRect.setFillStyle(0x00ff00, 0.3);
      } else {
        // Selection is invalid - color it yellow
        this.gameScene.selectionRect.setStrokeStyle(2, 0xffff00);
        this.gameScene.selectionRect.setFillStyle(0xffff00, 0.3);
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
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.textContent = `[${timestamp}] ${message}`;
    
    // Add to newswire at the beginning (newest messages at the top)
    this.newswireText.insertBefore(messageElement, this.newswireText.firstChild);
    
    // Limit the number of messages
    while (this.newswireText.children.length > this.maxNewswireMessages) {
      // Remove oldest message (last child)
      this.newswireText.removeChild(this.newswireText.lastChild);
    }
    
    // Update the main newswire content to display at least the most recent message
    // when not expanded
    if (!this.isNewswireExpanded && messageElement.textContent) {
      this.newswire.setAttribute('title', messageElement.textContent);
    }
  }
  
  /**
   * Clears all messages from the newswire
   */
  public clearNewswire() {
    this.newswireText.innerHTML = '';
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
    
    // Limit the number of messages
    while (this.newswireText.children.length > this.maxNewswireMessages) {
      // Remove oldest message (last child)
      this.newswireText.removeChild(this.newswireText.lastChild);
    }
  }
}

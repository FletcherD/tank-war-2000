// Function to get URL parameters
function getUrlParam(name: string, defaultValue: string): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || defaultValue;
}

// Get server URL from URL parameters or use default
const serverUrl = getUrlParam('server', 'wss://us-lax-f83c5951.colyseus.cloud');

export const BACKEND_URL = `${serverUrl}`;
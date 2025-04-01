// Function to get URL parameters
function getUrlParam(name: string, defaultValue: string): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || defaultValue;
}

// Get server URL from URL parameters or use default
const serverUrl = getUrlParam('server', 'localhost:2567');

// Determine if we're in a secure context
const isSecure = window.location.protocol === 'https:';

// Use secure WebSocket (wss://) when on HTTPS
export const BACKEND_URL = (window.location.href.indexOf("localhost") === -1 && !serverUrl.includes(':'))
    ? `${isSecure ? 'wss' : 'ws'}://${window.location.hostname}${(window.location.port && `:${window.location.port}`)}`
    : `${isSecure ? 'wss' : 'ws'}://${serverUrl}`;

// Use secure HTTP (https://) when on HTTPS
const rawBackendHttpUrl = isSecure 
    ? BACKEND_URL.replace("wss", "https") 
    : BACKEND_URL.replace("ws", "http");

// Use a CORS proxy if needed (for demo/game jam only)
export const BACKEND_HTTP_URL = isSecure 
    ? `https://corsproxy.io/?${encodeURIComponent(rawBackendHttpUrl)}`
    : rawBackendHttpUrl;
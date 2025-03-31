// Function to get URL parameters
function getUrlParam(name: string, defaultValue: string): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || defaultValue;
}

// Get server URL from URL parameters or use default
const serverUrl = getUrlParam('server', 'localhost:2567');

export const BACKEND_URL = (window.location.href.indexOf("localhost") === -1 && !serverUrl.includes(':'))
    ? `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${(window.location.port && `:${window.location.port}`)}`
    : `ws://${serverUrl}`;

export const BACKEND_HTTP_URL = BACKEND_URL.replace("ws", "http");
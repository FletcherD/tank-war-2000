// Function to get URL parameters
function getUrlParam(name: string, defaultValue: string): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || defaultValue;
}

// Get server URL from URL parameters or use default
const serverUrl = getUrlParam('server', 'localhost:2567');

export const BACKEND_URL = `${serverUrl}`;

export const BACKEND_HTTP_URL = BACKEND_URL
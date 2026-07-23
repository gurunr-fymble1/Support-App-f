import Constants from "expo-constants";

const { backendUrl, backendPort } = Constants.expoConfig.extra;

let API_URL;

if (backendUrl.startsWith("http://")) {
  API_URL = `${backendUrl}:${backendPort}`;
} else {
  API_URL = backendUrl;
}

// API_URL = "https://unitalicized-nonexotic-see.ngrok-free.dev"

export default {
  API_URL
};
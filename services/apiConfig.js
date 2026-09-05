import Constants from "expo-constants";

const { backendUrl, backendPort } = Constants.expoConfig.extra;

console.log("backendUrl", backendUrl)
if (!backendUrl) {
  throw new Error("backendUrl is not configured in app.json");
}

let API_URL;

if (backendUrl.startsWith("http://")) {
  API_URL = `${backendUrl}:${backendPort}`;
  console.log("API_URL", API_URL)
} else {
  API_URL = backendUrl;
}
console.log("API BASE URL:", API_URL);



// API_URL = "https://unitalicized-nonexotic-see.ngrok-free.dev"

export default {
  API_URL
};
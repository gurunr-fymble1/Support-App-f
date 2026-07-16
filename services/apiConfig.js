import Constants from "expo-constants";

const { backendUrl, backendPort } = Constants.expoConfig.extra;

let API_URL;

if (backendUrl.startsWith("http://")) {
  API_URL = `${backendUrl}:${backendPort}`;
} else {
  API_URL = backendUrl;
}

API_URL = "https://42c2-27-7-187-172.ngrok-free.app"

export default {
  API_URL
};
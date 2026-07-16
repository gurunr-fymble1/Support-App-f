import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "../services/utils/Toaster";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast config={toastConfig} />
    </>
  );
}

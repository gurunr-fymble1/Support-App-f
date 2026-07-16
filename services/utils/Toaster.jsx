import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#6FF28D" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#87CEEB" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
};

export const showToast = (arg1, arg2, arg3, arg4) => {
  let type = "success";
  let title = "";
  let desc = "";
  let visibilityTime = "3000";

  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    type = arg1.type || "success";
    title = arg1.title || "";
    desc = arg1.desc || "";
    visibilityTime = arg1.visibilityTime || "3000";
  } else {
    // positional arguments: showToast(title, desc, type, visibilityTime)
    title = typeof arg1 === "string" ? arg1 : (arg1?.toString() || "");
    
    if (arg2) {
      if (typeof arg2 === "string") {
        desc = arg2;
      } else if (arg2 instanceof Error) {
        desc = arg2.message;
      } else if (typeof arg2 === "object") {
        desc = arg2.message || arg2.response?.data?.detail || JSON.stringify(arg2);
      } else {
        desc = arg2.toString();
      }
    }
    
    type = arg3 || "success";
    visibilityTime = arg4 || "3000";
  }

  // Ensure type matches the config keys
  if (type === "warning") {
    // Map warning to info or custom if not configured
    type = "info";
  }

  Toast.show({
    type,
    text1: title,
    text2: desc,
    visibilityTime: Number(visibilityTime) || 3000,
  });
};

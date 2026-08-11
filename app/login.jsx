import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import apiConfig from "../services/apiConfig";
import { login } from "../services/login";
import { showToast } from "../services/utils/Toaster";

const { width } = Dimensions.get("window");

// Defined at module level so React never recreates this component type on re-renders.
// If defined inside LoginScreen, every state change (e.g. typing) causes a new
// component type reference → unmount/remount → keyboard dismissal.
const StyledInput = ({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  iconName,
  toggleSecure,
  isSecureField,
  showValue,
}) => {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons
        name={iconName}
        size={18}
        color="rgba(255,255,255,0.45)"
        style={styles.inputIcon}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isSecureField ? !showValue : false}
        keyboardType={keyboardType || "default"}
        style={styles.textInput}
      />
      {isSecureField && (
        <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon}>
          <Ionicons
            name={showValue ? "eye-outline" : "eye-off-outline"}
            size={18}
            color="rgba(255,255,255,0.4)"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [error, setError] = useState(null);
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [isForget, setIsForget] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [key, setKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLogin = async () => {
    if (!contact || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await login({
        contact_number: contact,
        password: password,
      });

      if (data?.error) {
        setError(data.error);
        return;
      }

      const statusCode = data?.status ?? data?.data?.status;
      const message = data?.message ?? data?.data?.message;

      if (statusCode && statusCode != 200) {
        setError(message || "Invalid credentials. Please try again.");
        return;
      }

      // Token is already saved inside login.js — just navigate
      // router.push("/home")
      router.replace({ pathname: "/home", params: { user: JSON.stringify(data.data) } });
    } catch (err) {
      showToast("Error", "Login failed: " + (err?.message || ""), "error");
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
      setContact("");
      setPassword("");
    }

  };

  const handleContact = async (text) => {
    let cleaned = text.replace(/\D/g, "");
    cleaned = cleaned.slice(-10);
    setContact(cleaned);
  };

  const handleForgetPassword = async () => {
    if (!contact || !newPassword || !key) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.put(
        `${apiConfig.API_URL}/support/auth/reset-password`,
        {
          contact_number: contact,
          new_password: newPassword,
          key: key,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      // fetch() only rejects on network errors — HTTP 4xx/5xx responses
      // still resolve, so we must manually check res.ok to surface API errors.
      // console.log(res.data);

      // console.log("Password reset successful");
      setIsForget(false);
      setContact("");
      setNewPassword("");
      setKey("");
    } catch (err) {
      showToast("Error", "Password reset failed: " + (err?.message || ""), "error");
      setError(err.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Logo / Brand */}
          <View style={styles.logoContainer}>
            <Text style={styles.brand}>
              <Text style={styles.brandRed}>Fy</Text>
              <Text style={styles.brandWhite}>mble </Text>
            </Text>
            <Text style={styles.brandSub}>Support</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Inputs */}
          <StyledInput
            placeholder="Phone Number"
            value={contact}
            onChangeText={handleContact}
            keyboardType="phone-pad"
            iconName="call-outline"
          />

          {!isForget && (
            <StyledInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              isSecureField
              showValue={showPassword}
              toggleSecure={() => setShowPassword(!showPassword)}
              iconName="lock-closed-outline"
            />
          )}

          {isForget && (
            <>
              <StyledInput
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                isSecureField
                showValue={showNewPassword}
                toggleSecure={() => setShowNewPassword(!showNewPassword)}
                iconName="lock-closed-outline"
              />
              <StyledInput
                placeholder="Key"
                value={key}
                onChangeText={setKey}
                iconName="key-outline"
              />
            </>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color="#ff6b6b"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isForget ? handleForgetPassword : handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>
                  {isForget ? "Reset Password" : "Sign In"}
                </Text>
                <Ionicons
                  name={isForget ? "refresh-outline" : "arrow-forward-outline"}
                  size={18}
                  color="#fff"
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Forgot / Back link */}
          <TouchableOpacity
            onPress={() => {
              setIsForget(!isForget);
              setError(null);
            }}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              {isForget ? "← Back to Sign In" : "Forgot Password?"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    justifyContent: "center",
    alignItems: "center",
  },

  // Card
  card: {
    width: width > 420 ? 400 : "88%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 36,
    elevation: 12,
  },

  // Logo
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  brandRed: {
    color: "#eb5757",
  },
  brandWhite: {
    color: "#ffffff",
  },
  brandSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 4,
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.43)",
    marginBottom: 22,
  },

  // Input
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "400",
  },
  eyeIcon: {
    padding: 4,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
  },
  errorText: {
    color: "#ff8080",
    fontSize: 13,
    flex: 1,
  },

  // Button
  button: {
    backgroundColor: "#eb5757",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // Link
  linkButton: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  linkText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LoginScreen;
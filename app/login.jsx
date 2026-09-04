import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import logo2 from "../constants/Fymble.png";
import apiConfig from "../services/apiConfig";
import { login } from "../services/login";
import { showToast } from "../services/utils/Toaster";

const { width } = Dimensions.get("window");

// Pure presentational component defined at module level
const StyledInput = ({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  iconName,
  toggleSecure,
  isSecureField,
  showValue,
  style,
  ...rest
}) => {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons
        name={iconName}
        size={18}
        color="#64748b"
        style={styles.inputIcon}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isSecureField ? !showValue : false}
        keyboardType={keyboardType || "default"}
        style={[styles.textInput, style]}
        selectionColor="#eb5757"
        autoCapitalize="none"
        {...rest}
      />
      {isSecureField && (
        <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon} activeOpacity={0.7}>
          <Ionicons
            name={showValue ? "eye-outline" : "eye-off-outline"}
            size={18}
            color="#64748b"
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
  const [forgetStep, setForgetStep] = useState("send_otp"); // "send_otp" | "verify_otp" | "reset_password"
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
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

  const handleContact = (text) => {
    if (!text) {
      setContact("");
      return;
    }
    let cleaned = text.replace(/\D/g, "");
    cleaned = cleaned.slice(-10);
    setContact(cleaned);
  };

  const handleSendOTP = async () => {
    if (!contact || contact.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${apiConfig.API_URL}/support/auth/send_otp`,
        {
          mobile_number: contact,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const resData = res.data;
      if (resData?.status === 200) {
        showToast("Success", "OTP sent successfully", "success");
        setForgetStep("verify_otp");
      } else {
        setError(resData?.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to send OTP. Please try again.";
      showToast("Error", "Failed to send OTP: " + errorMsg, "error");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${apiConfig.API_URL}/support/auth/verify_otp`,
        {
          mobile_number: contact,
          otp: otp,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const resData = res.data;
      if (resData?.status === 200) {
        showToast("Success", "OTP verified successfully", "success");
        setForgetStep("reset_password");
      } else {
        setError(resData?.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Verification failed. Please try again.";
      showToast("Error", "Verification failed: " + errorMsg, "error");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgetPassword = async () => {
    if (!newPassword) {
      setError("Please enter your new password");
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
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      showToast("Success", "Password reset successful", "success");
      setIsForget(false);
      setForgetStep("send_otp");
      setContact("");
      setNewPassword("");
      setOtp("");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Password reset failed. Please try again.";
      showToast("Error", "Password reset failed: " + errorMsg, "error");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleForgetPasswordMode = () => {
    setIsForget(!isForget);
    setForgetStep("send_otp");
    setOtp("");
    setNewPassword("");
    setError(null);
  };

  const getButtonConfig = () => {
    if (!isForget) {
      return {
        text: "Sign In",
        icon: "arrow-forward-outline",
        handler: handleLogin,
      };
    }
    switch (forgetStep) {
      case "send_otp":
        return {
          text: "Send OTP",
          icon: "paper-plane-outline",
          handler: handleSendOTP,
        };
      case "verify_otp":
        return {
          text: "Verify OTP",
          icon: "checkmark-circle-outline",
          handler: handleVerifyOTP,
        };
      case "reset_password":
        return {
          text: "Reset Password",
          icon: "refresh-outline",
          handler: handleForgetPassword,
        };
      default:
        return {
          text: "Submit",
          icon: "arrow-forward-outline",
          handler: () => { },
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={["#ffe5e5ff", "#f8fafc", "#f6a1a1ff"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Soft background glows */}
        <View style={styles.glowCircle1} pointerEvents="none" />
        <View style={styles.glowCircle2} pointerEvents="none" />

        <View style={styles.card}>
          {/* Logo / Brand */}
          <View style={styles.logoContainer}>
            <Image source={logo2} style={styles.logoImage} resizeMode="contain" />
          </View>

          {/* Dynamic Header Titles */}
          <View style={styles.headerTextWrapper}>
            <Text style={styles.welcomeText}>
              {!isForget
                ? "Welcome Back"
                : forgetStep === "send_otp"
                  ? "Forgot Password"
                  : forgetStep === "verify_otp"
                    ? "Verify OTP"
                    : "Reset Password"}
            </Text>
            <Text style={styles.subtitleText}>
              {!isForget
                ? "Sign in to access support panel"
                : forgetStep === "send_otp"
                  ? "Enter your mobile number to receive verification code"
                  : forgetStep === "verify_otp"
                    ? `Enter the 6-digit code sent to ${contact}`
                    : "Choose a strong new password"}
            </Text>
          </View>

          {/* Step Progress indicators */}
          {isForget && (
            <View style={styles.stepProgressContainer}>
              <View style={[styles.stepDot, styles.stepDotActive]}>
                <Ionicons name="call" size={12} color="#fff" />
              </View>
              <View style={[styles.stepLine, forgetStep !== "send_otp" && styles.stepLineActive]} />
              <View style={[styles.stepDot, (forgetStep === "verify_otp" || forgetStep === "reset_password") && styles.stepDotActive]}>
                <Ionicons
                  name="keypad"
                  size={12}
                  color={(forgetStep === "verify_otp" || forgetStep === "reset_password") ? "#fff" : "#94a3b8"}
                />
              </View>
              <View style={[styles.stepLine, forgetStep === "reset_password" && styles.stepLineActive]} />
              <View style={[styles.stepDot, forgetStep === "reset_password" && styles.stepDotActive]}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={forgetStep === "reset_password" ? "#fff" : "#94a3b8"}
                />
              </View>
            </View>
          )}

          {/* Inputs */}
          {(!isForget || forgetStep === "send_otp" || forgetStep === "verify_otp") && (
            <StyledInput
              placeholder="Phone Number"
              value={contact}
              onChangeText={handleContact}
              keyboardType="phone-pad"
              iconName="call-outline"
              editable={!isForget || forgetStep === "send_otp"}
              style={forgetStep === "verify_otp" ? { opacity: 0.6 } : undefined}
            />
          )}

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

          {isForget && forgetStep === "verify_otp" && (
            <StyledInput
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              iconName="keypad-outline"
            />
          )}

          {isForget && forgetStep === "reset_password" && (
            <StyledInput
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              isSecureField
              showValue={showNewPassword}
              toggleSecure={() => setShowNewPassword(!showNewPassword)}
              iconName="lock-closed-outline"
            />
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color="#ef4444"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={buttonConfig.handler}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>
                  {buttonConfig.text}
                </Text>
                <Ionicons
                  name={buttonConfig.icon}
                  size={18}
                  color="#fff"
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Forgot / Back link */}
          <TouchableOpacity
            onPress={toggleForgetPasswordMode}
            style={styles.linkButton}
            activeOpacity={0.7}
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
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  glowCircle1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(235, 87, 87, 0.07)",
    top: "12%",
    left: "-12%",
  },
  glowCircle2: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    bottom: "12%",
    right: "-15%",
  },

  // Card
  card: {
    width: width > 420 ? 400 : "88%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 28,
    paddingVertical: 36,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },

  // Logo
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 50,
  },

  // Header Texts
  headerTextWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },

  // Progress steps
  stepProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#eb5757",
    shadowColor: "#eb5757",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#eb5757",
  },

  // Input wrapper
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: "100%",
    color: "#0f172a",
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
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    flex: 1,
  },

  // Button
  button: {
    backgroundColor: "#ff5757",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
    shadowColor: "#ff5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
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
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LoginScreen;
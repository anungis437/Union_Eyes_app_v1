import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetSchema = z.object({
  code: z.string().min(6, 'Code must be 6 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

type Step = 'email' | 'code' | 'success';

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    control: emailControl,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailFormData>({
    defaultValues: {
      email: '',
    },
  });

  const {
    control: resetControl,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetFormData>({
    defaultValues: {
      code: '',
      password: '',
    },
  });

  const onRequestReset = async (data: EmailFormData) => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: data.email,
      });
      setEmail(data.email);
      setStep('code');
      Alert.alert('Code Sent', `A verification code has been sent to ${data.email}`);
    } catch (err: unknown) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (data: ResetFormData) => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: data.code,
        password: data.password,
      });

      setStep('success');
    } catch (err: unknown) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      {/* Title */}
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={64} color="#2563eb" />
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a verification code to reset your password
        </Text>
      </View>

      {/* Email Input */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <Controller
            control={emailControl}
            name="email"
            rules={{
              validate: (value) => {
                const result = emailSchema.shape.email.safeParse(value);
                return result.success || result.error.errors[0].message;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>
            )}
          />
          {emailErrors.email && <Text style={styles.errorText}>{emailErrors.email.message}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEmailSubmit(onRequestReset)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderCodeStep = () => (
    <>
      {/* Title */}
      <View style={styles.header}>
        <Ionicons name="mail" size={64} color="#2563eb" />
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>We've sent a verification code to</Text>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      {/* Reset Form */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Verification Code</Text>
          <Controller
            control={resetControl}
            name="code"
            rules={{
              validate: (value) => {
                const result = resetSchema.shape.code.safeParse(value);
                return result.success || result.error.errors[0].message;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            )}
          />
          {resetErrors.code && <Text style={styles.errorText}>{resetErrors.code.message}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <Controller
            control={resetControl}
            name="password"
            rules={{
              validate: (value) => {
                const result = resetSchema.shape.password.safeParse(value);
                return result.success || result.error.errors[0].message;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#6b7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          {resetErrors.password && (
            <Text style={styles.errorText}>{resetErrors.password.message}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetSubmit(onReset)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => handleEmailSubmit(onRequestReset)()}
        >
          <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color="#10b981" />
      </View>
      <Text style={styles.successTitle}>Password Reset Successful!</Text>
      <Text style={styles.successText}>
        Your password has been successfully reset. You can now sign in with your new password.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.buttonText}>Go to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {step === 'email' && renderEmailStep()}
          {step === 'code' && renderCodeStep()}
          {step === 'success' && renderSuccessStep()}

          {/* Back to Sign In */}
          {step !== 'success' && (
            <View style={styles.footer}>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <View style={styles.backLink}>
                    <Ionicons name="arrow-back" size={16} color="#2563eb" />
                    <Text style={styles.backLinkText}>Back to Sign In</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111827',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 6,
  },
});


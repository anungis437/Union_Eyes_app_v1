import React, { useState, useEffect } from 'react';
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
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

type Step = 'personal' | 'organization' | 'password' | 'verification';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('personal');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = new Animated.Value(1);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      acceptTerms: false,
    },
  });

  const formData = watch();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const canProceed = () => {
    switch (step) {
      case 'personal':
        return formData.firstName && formData.lastName && !errors.firstName && !errors.lastName;
      case 'organization':
        return true; // Organization is optional
      case 'password':
        return (
          formData.email &&
          formData.password &&
          formData.acceptTerms &&
          !errors.email &&
          !errors.password
        );
      case 'verification':
        return verificationCode.length === 6;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === 'personal') {
      setStep('organization');
    } else if (step === 'organization') {
      setStep('password');
    } else if (step === 'password') {
      await handleSubmit(onSignUp)();
    }
  };

  const handleBack = () => {
    if (step === 'organization') {
      setStep('personal');
    } else if (step === 'password') {
      setStep('organization');
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      await signUp.create({
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.email,
        password: data.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verification');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.errors?.[0]?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      await setActive({ session: completeSignUp.createdSessionId });
      Alert.alert('Welcome!', 'Your account has been created successfully');
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Verification Failed',
        err.errors?.[0]?.message || 'Invalid code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['personal', 'organization', 'password', 'verification'];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.slice(0, 3).map((s, index) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepCircle, index <= currentIndex && styles.stepCircleActive]}>
              {index < currentIndex ? (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            {index < 2 && (
              <View style={[styles.stepLine, index < currentIndex && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPersonalInfo = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>First Name</Text>
        <Controller
          control={control}
          name="firstName"
          rules={{
            validate: (value) => {
              const result = signUpSchema.shape.firstName.safeParse(value);
              return result.success || result.error.errors[0].message;
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Last Name</Text>
        <Controller
          control={control}
          name="lastName"
          rules={{
            validate: (value) => {
              const result = signUpSchema.shape.lastName.safeParse(value);
              return result.success || result.error.errors[0].message;
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Doe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
      </View>
    </Animated.View>
  );

  const renderOrganization = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text style={styles.infoText}>
        Select your organization (optional). You can also join an organization later.
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Organization (Optional)</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search organizations..."
            editable={!loading}
          />
        </View>
      </View>
    </Animated.View>
  );

  const renderPassword = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          rules={{
            validate: (value) => {
              const result = signUpSchema.shape.email.safeParse(value);
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
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          rules={{
            validate: (value) => {
              const result = signUpSchema.shape.password.safeParse(value);
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
                placeholder="Create a secure password"
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
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
      </View>

      <View style={styles.checkboxRow}>
        <Controller
          control={control}
          name="acceptTerms"
          rules={{
            validate: (value) => {
              const result = signUpSchema.shape.acceptTerms.safeParse(value);
              return result.success || result.error.errors[0].message;
            },
          }}
          render={({ field: { onChange, value } }) => (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => onChange(!value)}
              disabled={loading}
            >
              <Ionicons
                name={value ? 'checkbox' : 'square-outline'}
                size={20}
                color={value ? '#2563eb' : '#6b7280'}
              />
              <Text style={styles.checkboxText}>
                I accept the <Text style={styles.link}>Terms</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {errors.acceptTerms && <Text style={styles.errorText}>{errors.acceptTerms.message}</Text>}
    </Animated.View>
  );

  const renderVerification = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.verificationContainer}>
        <Ionicons name="mail" size={64} color="#2563eb" />
        <Text style={styles.verificationTitle}>Check Your Email</Text>
        <Text style={styles.verificationText}>We've sent a verification code to</Text>
        <Text style={styles.verificationEmail}>{formData.email}</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!canProceed() || loading) && styles.buttonDisabled]}
          onPress={onVerify}
          disabled={!canProceed() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Complete</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="eye" size={48} color="#2563eb" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            {step !== 'verification' && <Text style={styles.subtitle}>Join Union Eyes today</Text>}
          </View>

          {/* Step Indicator */}
          {step !== 'verification' && renderStepIndicator()}

          {/* Form Content */}
          <View style={styles.form}>
            {step === 'personal' && renderPersonalInfo()}
            {step === 'organization' && renderOrganization()}
            {step === 'password' && renderPassword()}
            {step === 'verification' && renderVerification()}
          </View>

          {/* Navigation Buttons */}
          {step !== 'verification' && (
            <View style={styles.buttonContainer}>
              {step !== 'personal' && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={loading}>
                  <Ionicons name="arrow-back" size={20} color="#2563eb" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.nextButton,
                  (!canProceed() || loading) && styles.buttonDisabled,
                ]}
                onPress={handleNext}
                disabled={!canProceed() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {step === 'password' ? 'Create Account' : 'Next'}
                    </Text>
                    {step !== 'password' && (
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Sign In Link */}
          {step === 'personal' && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity disabled={loading}>
                  <Text style={styles.linkText}>Sign In</Text>
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563eb',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#2563eb',
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
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  checkboxRow: {
    marginTop: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  nextButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  verificationContainer: {
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  verificationText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  verificationEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 32,
  },
  resendButton: {
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  linkText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
});


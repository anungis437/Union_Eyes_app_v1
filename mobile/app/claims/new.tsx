import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Card from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { DateTimePicker } from '@/components/DateTimePicker';
import { AttachmentCard } from '@/components/AttachmentCard';

const CLAIM_TYPES = [
  { id: 'overtime', label: 'Overtime Pay', icon: 'time', color: '#3B82F6' },
  { id: 'grievance', label: 'Grievance', icon: 'alert-circle', color: '#EF4444' },
  { id: 'safety', label: 'Safety Violation', icon: 'shield', color: '#F59E0B' },
  { id: 'benefits', label: 'Benefits', icon: 'medkit', color: '#10B981' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8B5CF6' },
];

const STEPS = ['Type', 'Details', 'Documents', 'Review'];

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document';
  size: number;
  uri: string;
}

export default function NewClaimScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [claimType, setClaimType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return claimType !== '';
      case 1:
        return title.trim() !== '' && description.trim() !== '';
      case 2:
        return true; // Attachments are optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSavingDraft(false);
    Alert.alert('Success', 'Draft saved successfully');
    router.back();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    Alert.alert('Success', 'Claim submitted successfully', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/claims') },
    ]);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name,
          type: file.mimeType?.startsWith('image/') ? 'image' : 'pdf',
          size: file.size || 0,
          uri: file.uri,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: `Photo_${Date.now()}.jpg`,
          type: 'image',
          size: photo.fileSize || 0,
          uri: photo.uri,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderTypeStep();
      case 1:
        return renderDetailsStep();
      case 2:
        return renderDocumentsStep();
      case 3:
        return renderReviewStep();
      default:
        return null;
    }
  };

  const renderTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of claim are you filing?</Text>
      <View style={styles.claimTypes}>
        {CLAIM_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.claimTypeCard, claimType === type.id && styles.claimTypeCardActive]}
            onPress={() => setClaimType(type.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.claimTypeIcon, { backgroundColor: type.color }]}>
              <Ionicons name={type.icon as any} size={28} color="#fff" />
            </View>
            <Text style={styles.claimTypeLabel}>{type.label}</Text>
            {claimType === type.id && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Provide claim details</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief description of claim"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detailed description of the incident or claim"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.7}>
          <Ionicons name="mic" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Incident Date</Text>
        <DateTimePicker value={incidentDate} onChange={setIncidentDate} mode="date" />
      </View>

      {claimType === 'overtime' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Amount ($)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            keyboardType="decimal-pad"
          />
        </View>
      )}
    </View>
  );

  const renderDocumentsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add supporting documents</Text>
      <Text style={styles.stepSubtitle}>Upload any relevant documents or photos</Text>

      <View style={styles.uploadButtons}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickDocument}
          activeOpacity={0.7}
        >
          <Ionicons name="document" size={32} color="#3B82F6" />
          <Text style={styles.uploadButtonText}>Choose File</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadButton} onPress={handleTakePhoto} activeOpacity={0.7}>
          <Ionicons name="camera" size={32} color="#3B82F6" />
          <Text style={styles.uploadButtonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {attachments.length > 0 && (
        <View style={styles.attachmentsList}>
          <Text style={styles.attachmentsTitle}>Attachments ({attachments.length})</Text>
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onRemove={() => handleRemoveAttachment(attachment.id)}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderReviewStep = () => {
    const selectedType = CLAIM_TYPES.find((t) => t.id === claimType);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review your claim</Text>
        <Text style={styles.stepSubtitle}>Please review all information before submitting</Text>

        <Card style={styles.reviewCard}>
          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Claim Type</Text>
            <Text style={styles.reviewValue}>{selectedType?.label}</Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Title</Text>
            <Text style={styles.reviewValue}>{title}</Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Description</Text>
            <Text style={styles.reviewValue}>{description}</Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Incident Date</Text>
            <Text style={styles.reviewValue}>{incidentDate.toLocaleDateString()}</Text>
          </View>

          {amount && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Amount</Text>
              <Text style={styles.reviewValue}>${amount}</Text>
            </View>
          )}

          {attachments.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Attachments</Text>
              <Text style={styles.reviewValue}>{attachments.length} file(s) attached</Text>
            </View>
          )}
        </Card>
      </View>
    );
  };

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Claim</Text>
        <TouchableOpacity
          onPress={handleSaveDraft}
          style={styles.headerButton}
          disabled={isSavingDraft}
          activeOpacity={0.7}
        >
          <Text style={styles.draftButton}>{isSavingDraft ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <ProgressBar steps={STEPS} currentStep={currentStep} style={styles.progressBar} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed() || isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting
                ? 'Submitting...'
                : currentStep === STEPS.length - 1
                  ? 'Submit Claim'
                  : 'Next'}
            </Text>
            {!isSubmitting && <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    headerButton: {
      width: 60,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      textAlign: 'center',
    },
    draftButton: {
      fontSize: 16,
      fontWeight: '600',
      color: '#3B82F6',
    },
    progressBar: {
      marginBottom: 0,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    stepContent: {
      gap: 20,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    stepSubtitle: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: -12,
    },
    claimTypes: {
      gap: 12,
    },
    claimTypeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    claimTypeCardActive: {
      borderColor: '#3B82F6',
      backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
    },
    claimTypeIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    claimTypeLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    checkmark: {
      marginLeft: 8,
    },
    formGroup: {
      gap: 8,
      position: 'relative',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    required: {
      color: '#EF4444',
    },
    input: {
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: isDark ? '#F9FAFB' : '#111827',
    },
    textArea: {
      height: 120,
      paddingTop: 12,
    },
    voiceButton: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    uploadButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#3B82F6',
      borderStyle: 'dashed',
      gap: 8,
    },
    uploadButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    attachmentsList: {
      gap: 12,
    },
    attachmentsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    reviewCard: {
      gap: 16,
    },
    reviewSection: {
      gap: 4,
    },
    reviewLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    reviewValue: {
      fontSize: 16,
      color: isDark ? '#F9FAFB' : '#111827',
      lineHeight: 22,
    },
    actions: {
      padding: 20,
      paddingTop: 12,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#E5E7EB',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    nextButton: {
      backgroundColor: '#3B82F6',
      ...Platform.select({
        ios: {
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    nextButtonDisabled: {
      backgroundColor: isDark ? '#374151' : '#D1D5DB',
      opacity: 0.6,
    },
    nextButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
  });


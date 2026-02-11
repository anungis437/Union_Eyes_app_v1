/**
 * OCR Results Screen
 * Display and manage extracted text from documents
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useDocumentsStore, selectDocumentById } from '../../src/store/documentsStore';
import { getConfidenceColor, getConfidenceLabel } from '../../src/config/ocr';

export default function OCRResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useDocumentsStore(selectDocumentById(id || ''));
  const { updateDocument } = useDocumentsStore();

  const [editableText, setEditableText] = useState(document?.ocrText || '');
  const [isEditing, setIsEditing] = useState(false);

  if (!document) {
    Alert.alert('Error', 'Document not found');
    router.back();
    return null;
  }

  const handleCopyToClipboard = async () => {
    await Clipboard.setStringAsync(editableText);
    Alert.alert('Copied', 'Text copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: editableText,
        title: document.title,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share text');
    }
  };

  const handleSave = () => {
    updateDocument(id!, { ocrText: editableText });
    setIsEditing(false);
    Alert.alert('Success', 'Text updated successfully');
  };

  const handleExport = () => {
    Alert.alert('Export', 'Choose export format', [
      {
        text: 'Text File (.txt)',
        onPress: () => console.log('Export as TXT'),
      },
      {
        text: 'PDF',
        onPress: () => console.log('Export as PDF'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const confidenceColor = getConfidenceColor(document.confidence || 0);
  const confidenceLabel = getConfidenceLabel(document.confidence || 0);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'OCR Results',
          headerRight: () => (
            <TouchableOpacity onPress={handleExport}>
              <Ionicons name="download-outline" size={24} color="#3b82f6" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="document-text" size={20} color="#6b7280" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Words</Text>
              <Text style={styles.statValue}>
                {editableText.split(/\s+/).filter(Boolean).length}
              </Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="language" size={20} color="#6b7280" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Language</Text>
              <Text style={styles.statValue}>{document.language?.toUpperCase() || 'EN'}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color={confidenceColor} />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Confidence</Text>
              <Text style={[styles.statValue, { color: confidenceColor }]}>{confidenceLabel}</Text>
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={styles.textHeader}>
            <Text style={styles.textTitle}>Extracted Text</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Ionicons
                name={isEditing ? 'checkmark' : 'create-outline'}
                size={24}
                color="#3b82f6"
              />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.textInput}
              value={editableText}
              onChangeText={setEditableText}
              multiline
              autoFocus
            />
          ) : (
            <ScrollView style={styles.textScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.textContent}>{editableText}</Text>
            </ScrollView>
          )}

          {isEditing && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        {!isEditing && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyToClipboard}>
              <Ionicons name="copy-outline" size={24} color="#3b82f6" />
              <Text style={styles.actionLabel}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#3b82f6" />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
              <Ionicons name="download-outline" size={24} color="#3b82f6" />
              <Text style={styles.actionLabel}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/documents/${id}`)}
            >
              <Ionicons name="eye-outline" size={24} color="#3b82f6" />
              <Text style={styles.actionLabel}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Page-by-Page Results */}
        {document.pages.length > 1 && (
          <View style={styles.pagesContainer}>
            <Text style={styles.pagesTitle}>Text by Page</Text>
            {document.pages.map((page, index) => (
              <View key={page.id} style={styles.pageCard}>
                <View style={styles.pageHeader}>
                  <Text style={styles.pageTitle}>Page {index + 1}</Text>
                  {page.ocrResult && (
                    <View style={styles.pageConfidence}>
                      <View
                        style={[
                          styles.confidenceDot,
                          {
                            backgroundColor: getConfidenceColor(page.ocrResult.confidence),
                          },
                        ]}
                      />
                      <Text style={styles.pageConfidenceText}>
                        {Math.round(page.ocrResult.confidence * 100)}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.pageText} numberOfLines={3}>
                  {page.ocrResult?.text || 'No text extracted'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statInfo: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    padding: 16,
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  textTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  textScroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  textContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  pagesContainer: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  pagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  pageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  pageConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pageConfidenceText: {
    fontSize: 12,
    color: '#6b7280',
  },
  pageText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});


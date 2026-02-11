import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document';
  size: number;
  url?: string;
  uri?: string;
}

interface AttachmentCardProps {
  attachment: Attachment;
  onPress?: () => void;
  onRemove?: () => void;
}

export function AttachmentCard({ attachment, onPress, onRemove }: AttachmentCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getFileIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'pdf':
        return { name: 'document-text', color: '#EF4444' };
      case 'image':
        return { name: 'image', color: '#3B82F6' };
      default:
        return { name: 'document', color: '#6B7280' };
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const icon = getFileIcon(attachment.type);
  const styles = createStyles(isDark);

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
        <Ionicons name={icon.name as any} size={24} color={icon.color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.fileName} numberOfLines={1}>
          {attachment.name}
        </Text>
        <Text style={styles.fileSize}>{formatFileSize(attachment.size)}</Text>
      </View>
      {onRemove ? (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.removeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
      )}
    </View>
  );

  if (onPress && !onRemove) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      gap: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 4,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    fileSize: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    removeButton: {
      padding: 4,
    },
  });


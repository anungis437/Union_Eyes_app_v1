import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Card from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { AttachmentCard } from '@/components/AttachmentCard';
import { format } from 'date-fns';

interface ClaimDetail {
  id: string;
  claimNumber: string;
  type: string;
  title: string;
  description: string;
  status: string;
  submittedDate: Date;
  updatedDate: Date;
  amount?: number;
  priority?: string;
  timeline: TimelineEvent[];
  attachments: Attachment[];
  notes: Note[];
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'comment' | 'status_change';
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
}

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document';
  size: number;
  url: string;
  uploadedDate: Date;
}

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
}

export default function ClaimDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [noteText, setNoteText] = useState('');

  const { data: claim, isLoading } = useQuery<ClaimDetail>({
    queryKey: ['claim', id],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return {
        id: id as string,
        claimNumber: 'CLM-2024-001',
        type: 'overtime',
        title: 'Overtime Pay - January 2024',
        description:
          'Requesting payment for 15 hours of overtime worked during the week of January 8-12, 2024. Overtime was required to meet project deadlines and was pre-approved by supervisor.',
        status: 'pending',
        submittedDate: new Date(2024, 0, 15),
        updatedDate: new Date(2024, 0, 20),
        amount: 450.0,
        priority: 'high',
        timeline: [
          {
            id: '1',
            type: 'created',
            title: 'Claim Submitted',
            description: 'Claim submitted for review',
            timestamp: new Date(2024, 0, 15, 9, 30),
            user: 'John Doe',
          },
          {
            id: '2',
            type: 'status_change',
            title: 'Status Updated',
            description: 'Status changed to "Under Review"',
            timestamp: new Date(2024, 0, 17, 14, 15),
            user: 'Jane Smith',
          },
          {
            id: '3',
            type: 'comment',
            title: 'Comment Added',
            description: 'Requested additional documentation',
            timestamp: new Date(2024, 0, 18, 11, 0),
            user: 'Jane Smith',
          },
          {
            id: '4',
            type: 'updated',
            title: 'Documents Uploaded',
            description: 'Timesheet and approval form added',
            timestamp: new Date(2024, 0, 20, 16, 45),
            user: 'John Doe',
          },
        ],
        attachments: [
          {
            id: '1',
            name: 'Timesheet_Jan_2024.pdf',
            type: 'pdf',
            size: 245678,
            url: 'https://example.com/file1.pdf',
            uploadedDate: new Date(2024, 0, 15),
          },
          {
            id: '2',
            name: 'Approval_Form.jpg',
            type: 'image',
            size: 1234567,
            url: 'https://example.com/file2.jpg',
            uploadedDate: new Date(2024, 0, 20),
          },
        ],
        notes: [
          {
            id: '1',
            content: 'All required documentation has been submitted.',
            author: 'John Doe',
            timestamp: new Date(2024, 0, 20, 17, 0),
          },
        ],
      };
    },
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Claim ${claim?.claimNumber}: ${claim?.title}\nStatus: ${claim?.status}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;

    Alert.alert('Success', 'Note added successfully');
    setNoteText('');
  };

  const getTimelineIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'create';
      case 'comment':
        return 'chatbubble';
      case 'status_change':
        return 'swap-horizontal';
      default:
        return 'information-circle';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const styles = createStyles(isDark);

  if (isLoading || !claim) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {claim.claimNumber}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Claim Info Card */}
        <Card style={styles.card}>
          <View style={styles.claimHeader}>
            <View style={styles.claimTitleRow}>
              <Text style={styles.claimTitle}>{claim.title}</Text>
              <StatusBadge status={claim.status} />
            </View>
            <Text style={styles.claimType}>{claim.type.toUpperCase()}</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Submitted</Text>
              <Text style={styles.infoValue}>{format(claim.submittedDate, 'MMM d, yyyy')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Updated</Text>
              <Text style={styles.infoValue}>{format(claim.updatedDate, 'MMM d, yyyy')}</Text>
            </View>
            {claim.amount && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Amount</Text>
                <Text style={styles.infoValue}>${claim.amount.toFixed(2)}</Text>
              </View>
            )}
            {claim.priority && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Priority</Text>
                <Text
                  style={[
                    styles.infoValue,
                    styles[
                      `priority${claim.priority.charAt(0).toUpperCase() + claim.priority.slice(1)}` as keyof typeof styles
                    ],
                  ]}
                >
                  {claim.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{claim.description}</Text>
          </View>
        </Card>

        {/* Timeline Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          <View style={styles.timeline}>
            {claim.timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineIconContainer}>
                  <View
                    style={[
                      styles.timelineIcon,
                      { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                    ]}
                  >
                    <Ionicons
                      name={getTimelineIcon(event.type)}
                      size={16}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </View>
                  {index !== claim.timeline.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{event.title}</Text>
                  {event.description && (
                    <Text style={styles.timelineDescription}>{event.description}</Text>
                  )}
                  <Text style={styles.timelineTime}>
                    {format(event.timestamp, 'MMM d, yyyy • h:mm a')}
                    {event.user && ` • ${event.user}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Attachments Card */}
        {claim.attachments.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Attachments ({claim.attachments.length})</Text>
            <View style={styles.attachmentsList}>
              {claim.attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  onPress={() => router.push(`/documents/${attachment.id}` as any)}
                />
              ))}
            </View>
          </Card>
        )}

        {/* Notes Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          {claim.notes.length > 0 && (
            <View style={styles.notesList}>
              {claim.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteFooter}>
                    {note.author} • {format(note.timestamp, 'MMM d, h:mm a')}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => router.push(`/claims/${id}/add-note` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={20} color="#3B82F6" />
            <Text style={styles.addNoteText}>Add Note</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
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
    backButton: {
      width: 40,
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
      marginHorizontal: 16,
    },
    shareButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    card: {
      marginBottom: 16,
    },
    claimHeader: {
      marginBottom: 16,
    },
    claimTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 8,
    },
    claimTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    claimType: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      letterSpacing: 0.5,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 16,
    },
    infoItem: {
      flex: 1,
      minWidth: '45%',
    },
    infoLabel: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    priorityHigh: {
      color: '#EF4444',
    },
    priorityMedium: {
      color: '#F59E0B',
    },
    priorityLow: {
      color: '#10B981',
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
      marginVertical: 16,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: isDark ? '#D1D5DB' : '#374151',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 16,
    },
    timeline: {
      gap: 0,
    },
    timelineItem: {
      flexDirection: 'row',
      gap: 12,
    },
    timelineIconContainer: {
      alignItems: 'center',
      width: 32,
    },
    timelineIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: 20,
    },
    timelineTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 4,
    },
    timelineDescription: {
      fontSize: 13,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 4,
    },
    timelineTime: {
      fontSize: 12,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    attachmentsList: {
      gap: 12,
    },
    notesList: {
      gap: 12,
      marginBottom: 16,
    },
    noteItem: {
      padding: 12,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      borderRadius: 8,
    },
    noteContent: {
      fontSize: 14,
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 8,
      lineHeight: 20,
    },
    noteFooter: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    addNoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3B82F6',
      borderStyle: 'dashed',
    },
    addNoteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#3B82F6',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
  });

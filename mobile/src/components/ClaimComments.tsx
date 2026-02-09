/**
 * Claim Comments Component
 * Comment list and input with @mentions support
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { ClaimComment } from '@/types/claims';

interface ClaimCommentsProps {
  claimId: string;
  comments: ClaimComment[];
  currentUserId: string;
  onAddComment: (content: string, mentions?: string[]) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onVoiceInput?: () => Promise<string>;
  isLoading?: boolean;
}

export function ClaimComments({
  claimId,
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onVoiceInput,
  isLoading = false,
}: ClaimCommentsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);

  const [commentText, setCommentText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const text = commentText.trim();
    if (!text) return;

    setIsSubmitting(true);
    try {
      // Extract mentions (@username)
      const mentions = text.match(/@(\w+)/g)?.map((m) => m.substring(1)) || [];
      await onAddComment(text, mentions);
      setCommentText('');
      inputRef.current?.blur();
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: ClaimComment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    const text = editingText.trim();
    if (!text) return;

    setIsSubmitting(true);
    try {
      await onEditComment(commentId, text);
      setEditingId(null);
      setEditingText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDeleteComment(commentId);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  const handleVoiceInput = async () => {
    if (!onVoiceInput) return;

    try {
      const text = await onVoiceInput();
      setCommentText((prev) => (prev ? `${prev} ${text}` : text));
    } catch (error) {
      Alert.alert('Error', 'Voice input failed');
    }
  };

  const renderComment = ({ item: comment }: { item: ClaimComment }) => {
    const isEditing = editingId === comment.id;
    const isOwnComment = comment.author.id === currentUserId;
    const isPending = comment.isPending;

    return (
      <View style={[styles.commentContainer, isPending && styles.pendingComment]}>
        {/* Avatar */}
        <View style={styles.avatar}>
          {comment.author.avatar ? (
            <Text style={styles.avatarText}>{comment.author.name.charAt(0).toUpperCase()}</Text>
          ) : (
            <Ionicons name="person-circle" size={40} color={isDark ? '#4B5563' : '#D1D5DB'} />
          )}
        </View>

        {/* Content */}
        <View style={styles.commentContent}>
          {/* Header */}
          <View style={styles.commentHeader}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{comment.author.name}</Text>
              {comment.author.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{comment.author.role}</Text>
                </View>
              )}
            </View>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </Text>
          </View>

          {/* Body */}
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editingText}
                onChangeText={setEditingText}
                multiline
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={() => handleSaveEdit(comment.id)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.commentText}>{comment.content}</Text>
          )}

          {comment.isEdited && !isEditing && <Text style={styles.editedLabel}>(edited)</Text>}

          {/* Actions */}
          {isOwnComment && !isEditing && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(comment)}>
                <Ionicons name="create-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(comment.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPending && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={14} color="#F59E0B" />
              <Text style={styles.pendingText}>Pending sync</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Comments List */}
      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment</Text>
          </View>
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#3B82F6'} />
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={2000}
        />

        <View style={styles.inputActions}>
          {onVoiceInput && (
            <TouchableOpacity style={styles.iconButton} onPress={handleVoiceInput}>
              <Ionicons name="mic-outline" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!commentText.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      padding: 16,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    emptySubtext: {
      marginTop: 8,
      fontSize: 14,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    commentContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    pendingComment: {
      opacity: 0.7,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    commentContent: {
      flex: 1,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    authorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    authorName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      marginRight: 8,
    },
    roleBadge: {
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    roleText: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    timestamp: {
      fontSize: 12,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    commentText: {
      fontSize: 14,
      lineHeight: 20,
      color: isDark ? '#D1D5DB' : '#374151',
    },
    editedLabel: {
      fontSize: 12,
      color: isDark ? '#6B7280' : '#9CA3AF',
      fontStyle: 'italic',
      marginTop: 4,
    },
    actions: {
      flexDirection: 'row',
      marginTop: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    actionText: {
      fontSize: 13,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginLeft: 4,
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: isDark ? '#78350F' : '#FEF3C7',
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    pendingText: {
      fontSize: 12,
      color: '#F59E0B',
      marginLeft: 4,
    },
    editContainer: {
      marginTop: 8,
    },
    editInput: {
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
      borderColor: isDark ? '#374151' : '#D1D5DB',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: isDark ? '#F9FAFB' : '#111827',
      minHeight: 80,
      maxHeight: 200,
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
    },
    editButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginLeft: 8,
    },
    cancelButton: {
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#D1D5DB' : '#4B5563',
    },
    saveButton: {
      backgroundColor: '#3B82F6',
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#E5E7EB',
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    },
    input: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
      borderColor: isDark ? '#374151' : '#D1D5DB',
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: isDark ? '#F9FAFB' : '#111827',
      maxHeight: 100,
    },
    inputActions: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginLeft: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#3B82F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: isDark ? '#374151' : '#D1D5DB',
    },
  });

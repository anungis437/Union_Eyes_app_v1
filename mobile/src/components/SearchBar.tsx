import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
  onFocus,
  onBlur,
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isFocused, setIsFocused] = React.useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
  };

  const styles = createStyles(isDark, isFocused);

  return (
    <Animated.View style={[styles.container, style, { transform: [{ scale: scaleAnim }] }]}>
      <Ionicons
        name="search"
        size={20}
        color={isFocused ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const createStyles = (isDark: boolean, isFocused: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: 2,
      borderColor: isFocused ? '#3B82F6' : 'transparent',
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#F9FAFB' : '#111827',
      padding: 0,
    },
    clearButton: {
      padding: 4,
      marginLeft: 4,
    },
  });

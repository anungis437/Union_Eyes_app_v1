import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
}: DateTimePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [show, setShow] = React.useState(false);

  const formatValue = (date: Date) => {
    if (mode === 'date') {
      return format(date, 'MMMM d, yyyy');
    } else if (mode === 'time') {
      return format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  const getIcon = () => {
    if (mode === 'time') return 'time-outline';
    return 'calendar-outline';
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const styles = createStyles(isDark);

  return (
    <View>
      <TouchableOpacity style={styles.container} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name={getIcon()} size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        <Text style={styles.text}>{formatValue(value)}</Text>
        <Ionicons name="chevron-down" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>

      {show && (
        <RNDateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    text: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#F9FAFB' : '#111827',
    },
  });


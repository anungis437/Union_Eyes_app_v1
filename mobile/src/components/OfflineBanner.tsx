import React from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isConnected } = useNetworkStatus();
  const slideAnim = React.useRef(new Animated.Value(-60)).current;

  React.useEffect(() => {
    if (!isConnected) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected]);

  const styles = createStyles(isDark);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={styles.text}>You're offline. Some features may be limited.</Text>
    </Animated.View>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F59E0B',
      paddingVertical: 8,
      paddingHorizontal: 16,
      gap: 8,
    },
    text: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
  });


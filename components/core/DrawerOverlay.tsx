import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
// import Animated, {
//   useAnimatedStyle,
//   withTiming,
//   interpolate,
// } from 'react-native-reanimated';
import { BrandColors } from '@/constants/Colors';
import { useDrawerStore } from '@/stores';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

/**
 * DrawerOverlay Component
 * Single Responsibility: Semi-transparent backdrop that closes drawer on press
 */
export function DrawerOverlay() {
  const { isOpen, closeDrawer } = useDrawerStore();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isOpen ? 1 : 0, { duration: 200 }),
      pointerEvents: isOpen ? 'auto' : 'none',
    };
  }, [isOpen]);

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      <Pressable style={styles.pressable} onPress={closeDrawer} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BrandColors.overlayBg,
    zIndex: 50,
  },
  pressable: {
    flex: 1,
  },
});

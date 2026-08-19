import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BrandColors } from "@/constants/Colors";
import { useDrawerStore } from "@/stores";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * PageHeader Component
 * Reusable header for all main screens with consistent styling
 */
interface PageHeaderProps {
  title: string;
  showMenuButton?: boolean;
  actionBtn?: React.ReactElement;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function PageHeader({
  title,
  showMenuButton = true,
  actionBtn,
  showBackButton = false,
  onBack,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((state) => state.openDrawer);
  const scale = useSharedValue(1);

  // bounce the header in on mount
  const headerTranslateY = useSharedValue(-40);
  const headerOpacity = useSharedValue(0);

  React.useEffect(() => {
    headerTranslateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.exp),
    });
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.exp),
    });
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: headerOpacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.9, { stiffness: 400, damping: 15 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 400, damping: 15 });
  }, []);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 16,
          backgroundColor: BrandColors.primary,
        },
        headerAnimatedStyle,
      ]}
    >
      {showBackButton && (
        <AnimatedPressable
          onPress={onBack}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.menuButton, buttonAnimatedStyle]}
        >
          <View style={styles.iconContainer}>
            <FontAwesome
              name="arrow-left"
              size={20}
              color={BrandColors.white}
            />
          </View>
        </AnimatedPressable>
      )}

      {actionBtn}
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right actions area */}
      <View style={styles.actions}>
        {showMenuButton && (
          <AnimatedPressable
            onPress={openDrawer}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.menuButton, buttonAnimatedStyle]}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="bars" size={22} color={BrandColors.white} />
            </View>
          </AnimatedPressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    padding: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});

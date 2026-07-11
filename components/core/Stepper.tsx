import { BrandColors } from "@/constants/Colors";
import { FontAwesome } from "@expo/vector-icons";
import { Fragment } from "react";
import { StyleSheet } from "react-native";
import { Text, View } from "../Themed";

interface StepItem {
  label: string;
  value: number;
  icon?: string;
  disabled?: boolean;
  onPress?: () => void;
}

interface StepperProps {
  activeStep: number;
  showLabel?: boolean;
  items: StepItem[];
}

const DEFAULT_ITEMS: StepItem[] = [
  { label: "Draft", value: 1, icon: "file-text-o" },
  { label: "Pilih Pekerja", value: 2, icon: "user" },
  { label: "BKM", value: 3, icon: "money" },
];

export function Stepper({
  items = DEFAULT_ITEMS,
  activeStep = 1,
  showLabel = true,
}: StepperProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isCompleted = activeStep > item.value;
          const isCurrent = activeStep === item.value;

          return (
            <Fragment key={item.value}>
              {/* Step column: circle + label */}
              <View style={styles.stepColumn}>
                <StepCircle
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  stepData={item}
                />
                {showLabel && (
                  <Text
                    style={[
                      styles.label,
                      isCurrent && styles.labelCurrent,
                      isCompleted && styles.labelCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                )}
              </View>

              {/* Connector line between steps */}
              {!isLast && (
                <View style={styles.lineWrapper}>
                  <View
                    style={[
                      styles.line,
                      isCompleted ? styles.lineActive : styles.lineInactive,
                    ]}
                  />
                </View>
              )}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

const StepCircle = ({
  isCurrent,
  isCompleted,
  stepData,
}: {
  isCurrent: boolean;
  isCompleted: boolean;
  stepData: StepItem;
}) => {
  if (isCompleted) {
    return (
      <View style={[styles.circle, styles.circleCompleted]}>
        <FontAwesome name="check" size={14} color={BrandColors.white} />
      </View>
    );
  }

  if (isCurrent) {
    return (
      <View style={[styles.circle, styles.circleCurrent]}>
        <Text style={styles.circleTextCurrent}>{stepData.value}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.circle, styles.circleFuture]}>
      <Text style={styles.circleTextFuture}>{stepData.value}</Text>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const CIRCLE_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "transparent",
  },

  // Step column (circle + label stacked)
  stepColumn: {
    alignItems: "center",
    backgroundColor: "transparent",
    width: 72,
  },

  // Circle
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleCompleted: {
    backgroundColor: BrandColors.primary,
  },
  circleCurrent: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: BrandColors.primary,
  },
  circleFuture: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: BrandColors.inputBorder,
  },

  // Circle text
  circleTextCurrent: {
    color: BrandColors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  circleTextFuture: {
    color: BrandColors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  // Label
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "500",
    color: BrandColors.textMuted,
    textAlign: "center",
  },
  labelCurrent: {
    color: BrandColors.primary,
    fontWeight: "600",
  },
  labelCompleted: {
    color: BrandColors.textSecondary,
  },

  // Connector line
  lineWrapper: {
    flex: 1,
    justifyContent: "center",
    height: CIRCLE_SIZE,
    backgroundColor: "transparent",
    paddingHorizontal: 4,
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
  lineActive: {
    backgroundColor: BrandColors.primary,
  },
  lineInactive: {
    backgroundColor: BrandColors.inputBorder,
  },
});

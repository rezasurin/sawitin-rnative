import { AntDesign } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";
import { BrandColors } from "../../constants/Colors";

interface FABProps {
  onPress?: () => void;
  label?: string;
}

export const FAB = ({ onPress, label = 'Tambah data' }: FABProps) => {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={styles.container} onPress={onPress}>
      <AntDesign name="plus" size={24} color={BrandColors.white} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.primary,
    borderRadius: 50,
    padding: 16,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 20,
    bottom: 100,
    zIndex: 1000,
  },
});

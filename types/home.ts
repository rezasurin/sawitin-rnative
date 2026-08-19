/**
 * Home Screen Types
 * Following Interface Segregation Principle - small, focused interfaces
 */

export interface DrawerMenuItem {
  id: string;
  label: string;
  icon: string;
  onPress?: () => void;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
}

export interface UserProfile {
  name: string;
  phone: string;
  groupCode: string; // e.g., "Kel. B20"
}

export type ConnectionType = "wifi" | "cellular" | "none" | "unknown";

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
  connectionLabel: string; // e.g., "Data seluler", "WiFi"
}

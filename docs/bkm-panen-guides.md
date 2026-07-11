# Technical Design Brief: BKM Panen Digital (React Native)

This document provides technical instructions for an AI Developer Agent to implement the "BKM Panen Digital" mobile application screens using React Native.

## 1. Visual Foundation (Design Tokens)

**Theme:** Light Nature / Agritech
**Primary Color:** #6B7B3C (Olive Green)
**Background:** #FFFFFF (White)
**Typography:** Inter (Sans-serif)
**Radius:** 4px (Subtle Rounding)

### Color Palette

- `primary`: #6B7B3C (Olive Green, Header, Focus states)
- `button`: #C4A35A (Golden/Tan, Primary Buttons)
- `background`: #FFFFFF (Main App Surface)
- `surface` (cardBg): #F5F5F5 (Card and Container backgrounds)
- `border` (inputBorder): #E0E0E0 (Separators, Outlines, Input borders)
- `text-primary`: #333333 (Headings, Primary content)
- `text-secondary`: #666666 (Labels, Secondary info)
- `text-muted`: #999999 (Disabled text, Placeholders)
- `error`: #DC3545 (Delete icons, High-alert issues)
- `success`: #4CAF50 (Success toast, Online status)

## 2. Shared Components

### TopAppBar

- **Structure:** Left (Back Icon), Center (Screen Title), Right (More/Context Menu).
- **Style:** Fixed height (56-64dp), primary background (Olive Green), subtle bottom border.

### StepProgressBar

- **Logic:** 4 Steps (Lokasi -> Pekerja -> Grading -> Review).
- **Style:** Horizontal line with numbered circles. Active step highlighted in Olive Green; completed steps show a checkmark.

### BottomNavBar

- **Destinations:** Dokumen, Pekerja, Grading, Review.
- **Style:** Icon + Label. Active state uses Olive Green text/icon and a subtle background highlight.

## 3. Screen Specifications

### Screen 1: Header Dokumen (Step 1)

- **Input Fields:** Date Picker, Dropdown for Afdeling, Dropdown for Blok, Searchable Select for Grup Pekerja.
- **Section: Informasi Tambahan**: Read-only grid showing Tahun Tanam, Jumlah Pokok, and Target BJR.
- **Primary Action:** "Lanjutkan ke Grading" (Golden/Tan Button).

### Screen 2: Pilih Pekerja & TPH (Step 2)

- **TPH Selection:** Horizontal scrollable chips for active TPHs. Selected chips have Olive Green background.
- **Worker List:** Vertical list of workers. Each row includes: Avatar/Initials, Name, Position, ID, and a Numeric Input for "Janjang" count.
- **Summary Section:** "Ringkasan Aktif" card showing Total TPH, Total Pekerja, and Estimasi Janjang.

### Screen 3: Input Grading (Step 3)

- **Layout:** Large vertical cards for fruit categories (Normal, Mentah, Over Ripe, etc.).
- **Interaction:** Stepper controls ([-] [Value] [+]) with large tap targets for field use.
- **Header Context:** Display current "Lokasi TPH" and "Total Janjang" as a sticky reference.

### Screen 4: Review & Submit (Step 4)

- **Sections:**
  1. Ringkasan Header (ID, Date, Block, Group).
  2. Ringkasan Produksi (Grid of metrics: Workers, TPH, Total Janjang, Est. Tonnage).
  3. Grading Summary (List with status dots and counts).
- **Confirmation:** Checkbox for data validation statement.
- **Primary Actions:** "Submit BKM" (Golden/Tan) and "Edit Data" (Outline).

## 4. Implementation Notes (React Native)

- Use `FlatList` for worker and grading lists to ensure performance.
- Use `Pressable` or `TouchableOpacity` with consistent `activeOpacity={0.7}`.
- Implement responsive padding/margins (Base unit: 4px/8px).
- Typography scale:
  - Header: 18-20px, Bold
  - Subheader: 14px, Semi-bold (Caps)
  - Body: 14-16px, Regular
  - Caption: 12px, Medium

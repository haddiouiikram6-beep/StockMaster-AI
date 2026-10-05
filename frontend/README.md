# 📱 StockMaster-AI — Mobile Application

StockMaster-AI is a production-ready React Native mobile application built with **Expo**, **Expo Router**, and **TypeScript**, styled strictly after the official design system specification.

---

## 🎨 Visual Design & Color Palette

- **Primary Dark Navy**: `#003B5C`
- **Primary Blue**: `#006FA6`
- **Bright Blue**: `#008CC9`
- **Light Cyan**: `#D9F4F2`
- **Background**: `#F5FBFA`
- **Text**: `#123047`
- **Secondary Text**: `#6B7C86`
- **Success / In Stock**: `#19C37D` (`#E9F9F2` bg)
- **Warning / Low Stock**: `#F5C542` (`#FEF7E6` bg)
- **Danger / Critical**: `#FF6B6B` (`#FEECEB` bg)
- **Borders**: `#D8E7E7`

---

## 🚀 Quick Start (Expo Go on Physical Android / iOS)

### 1. Configure the API URL
In `frontend/.env`, set your local network IP (already pre-configured to your Wi-Fi IPv4):
```env
EXPO_PUBLIC_API_URL=http://192.168.1.136:3000/api
```

### 2. Start the Expo Development Server
```bash
cd frontend
npm start
```
Or:
```bash
npx expo start -c
```

### 3. Open on Physical Device
1. Install **Expo Go** from Google Play Store or Apple App Store.
2. Ensure your phone and development computer are connected to the same Wi-Fi network (`192.168.1.x`).
3. Scan the QR code displayed in the terminal with Expo Go (Android) or the Camera app (iOS).

---

## 🔑 Test Credentials

The backend seed provides ready-to-test accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Manager** | `manager@stockmaster.com` | `Manager123!` |
| **Admin** | `admin@stockmaster.com` | `Admin123!` |
| **Employee** | `employee@stockmaster.com` | `Employee123!` |

*(The login screen also features 1-tap quick buttons to auto-fill these credentials)*

---

## 🏗️ Architecture & Screens

```text
app/
├── _layout.tsx              # Root Layout: QueryClient, SafeArea, Auth Initialization
├── index.tsx                # Auth Gate & Splash
├── (auth)/
│   ├── login.tsx            # Login screen matching design reference
│   └── register.tsx         # Account registration with role selection
├── (tabs)/
│   ├── _layout.tsx          # 4-Tab Bottom Navigation (Home, Products, AI, Profile)
│   ├── index.tsx            # Dashboard: 3 Stat Cards, AI Action Card, Low Stock, Movements
│   ├── products.tsx         # Catalog: Search, Filter Chips, Summary, AI Prompt Banner, Add Modal
│   ├── ai.tsx               # AI Assistant: SSE Streaming, Reorder Cards, Tool Pills, Suggestion Chips
│   └── profile.tsx          # Profile & Settings: Preferences, Store Locations, API Config, Logout
├── products/
│   └── [id].tsx             # Product Details: Metrics, Info Grid, Movements, Add/Remove Stock
└── stock/
    └── movement.tsx         # Standalone Stock Movement modal (IN / OUT / ADJUSTMENT)

src/
├── components/              # 18 reusable design system UI components
├── constants/               # Color tokens, typography, and shadow definitions
├── hooks/                   # TanStack Query server-state hooks
├── services/                # Centralized Axios client with token refresh & SSE streaming
├── store/                   # Zustand + AsyncStorage authentication state
└── types/                   # Strict TypeScript domain interfaces
```

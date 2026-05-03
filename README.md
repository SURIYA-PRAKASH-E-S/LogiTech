# LogiTech - Logistics Management System

A modern logistics and delivery management platform built with React, TypeScript, Firebase, and Node.js. Streamline delivery operations with real-time tracking, driver management, and customer analytics.

## 🚀 Live Demo
[View Live Demo](https://logic-flow-e72c1.web.app/) - Experience the platform in action

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Local Development](#-local-development)
- [Firebase Deployment](#-firebase-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)

## 🎯 Project Overview

LogiTech is a comprehensive delivery management system designed to streamline logistics operations for businesses of all sizes. The platform provides real-time tracking, intelligent route optimization, driver management and customer analytics.

### Key Benefits

- **🚚 Real-time Tracking**: Monitor deliveries with GPS tracking
- **👥 Driver Management**: Efficient driver assignment and performance tracking
- **📱 Mobile Responsive**: Works seamlessly on all devices
- **🔔 Smart Notifications**: Automated alerts for delivery updates
- **📊 Analytics Dashboard**: Comprehensive operational insights
- **💳 Integrated Payments**: Razorpay payment processing
- **🖼️ Image Upload**: Cloudinary integration for delivery photos
- **🗺️ Route Optimization**: Intelligent route planning

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast development build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern component library
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe backend development
- **Firebase Functions** - Serverless backend
- **Firebase Realtime Database** - Real-time data synchronization

### Database & Services
- **Firebase Realtime Database** - NoSQL real-time database
- **Firebase Authentication** - User authentication
- **Firebase Hosting** - Static site hosting
- **Cloudinary** - Image storage and optimization
- **Razorpay** - Payment processing
- **Leaflet.js** - Mapping and location services

## ✨ Key Features

### Core Functionality

#### Driver Management
- **Driver Registration**: Add and manage delivery drivers
- **Real-time Location Tracking**: GPS-based driver location monitoring
- **Performance Analytics**: Driver rating and delivery statistics
- **Auto-sharing**: Automatic location sharing with customers
- **Status Management**: Available, busy, offline driver status

#### Shipment Management
- **Booking Creation**: Create and manage delivery bookings
- **Route Planning**: Intelligent route optimization
- **Real-time Tracking**: Live shipment tracking
- **Customer Details**: Complete customer information management
- **Status Updates**: Real-time delivery status notifications

#### Admin Dashboard
- **Comprehensive Analytics**: Overview of all operations
- **Customer Management**: Customer data and insights
- **Vehicle Management**: Fleet management and assignment
- **Revenue Tracking**: Financial analytics and reporting

#### User Experience
- **Responsive Design**: Works on all devices
- **Real-time Updates**: Live data synchronization
- **Intuitive Interface**: User-friendly design
- **Fast Performance**: Optimized for speed

### Technical Features

#### Authentication & Security
- **Firebase Auth**: Secure user authentication
- **Role-based Access**: Admin, driver, and customer roles
- **Secure APIs**: Protected backend endpoints
- **Data Validation**: Input sanitization and validation

#### Payment Integration
- **Razorpay Integration**: Secure payment processing
- **Multiple Payment Methods**: Credit cards, UPI, wallets
- **Transaction History**: Complete payment records
- **Refund Management**: Automated refund processing

#### Image & Media
- **Cloudinary Integration**: Optimized image storage
- **Photo Upload**: Delivery proof photos
- **Image Processing**: Automatic optimization
- **CDN Delivery**: Fast image loading

## 📁 Project Structure

```
logitech-route-flow-main/
├── 📁 public/                    # Static assets
├── 📁 src/                       # React application source
│   ├── 📁 components/           # Reusable UI components
│   │   ├── 📁 ui/               # Base UI components (shadcn/ui)
│   │   ├── 📁 layout/           # Layout components
│   │   ├── 📁 map/              # Map components
│   │   ├── DriverLocationUpdater.tsx
│   │   ├── GpsStatusIndicator.tsx
│   │   ├── ImageUploader.tsx
│   │   └── DriverLocationSharing.tsx
│   ├── 📁 contexts/             # React contexts
│   │   └── AuthContext.tsx      # Authentication context
│   ├── 📁 hooks/                # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── useDriverNotifications.ts
│   ├── 📁 lib/                  # Utilities and services
│   │   ├── firebase-utils.ts    # Firebase service functions
│   │   ├── tracking-service.ts  # Location tracking service
│   │   └── api.ts               # API configuration
│   ├── 📁 types/                # TypeScript type definitions
│   │   └── index.ts             # Global types
│   ├── App.tsx                   # Main application component
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Global styles
├── 📁 server/                    # Node.js backend server
│   ├── index.ts                  # Express server (TypeScript)
│   ├── package.json              # Server dependencies
│   └── tsconfig.json             # TypeScript configuration
├── 📁 functions/                 # Firebase Functions
│   ├── index.ts                  # Cloud functions
│   ├── package.json              # Functions dependencies
│   └── tsconfig.json             # Functions TypeScript config
├── 📄 package.json               # Main project dependencies
├── 📄 vite.config.ts             # Vite configuration
├── 📄 tailwind.config.ts         # Tailwind CSS configuration
├── 📄 tsconfig.json              # TypeScript configuration
├── 📄 firebase.json              # Firebase configuration
├── 📄 .firebaserc                # Firebase project settings
├── 📄 database.rules.json         # Firebase database rules
├── 📄 .env.example               # Environment variables template
└── 📄 demo.txt                   # Project overview
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Firebase account** and project
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SURIYA-PRAKASH-E-S/LogiTech.git
   cd LogiTech
   ```

2. **Install dependencies**
   ```bash
   # Install main dependencies
   npm install
   
   # Install server dependencies
   cd server && npm install && cd ..
   
   # Install functions dependencies
   cd functions && npm install && cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   ```

4. **Firebase Setup**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase
   firebase init
   ```

## 🖥️ Local Development

### Environment Variables

Create a `.env` file in the root directory using `.env.example` as template:

```env
# Environment Configuration
VITE_ENVIRONMENT=development
VITE_PRIMARY_API=http://localhost:3001
VITE_FALLBACK_API=http://localhost:3001

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_secret

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Running the Application

#### Option 1: Full Development (Recommended)
```bash
npm run dev:full
```
This starts both the React app and TypeScript server simultaneously:
- React app at `http://localhost:5173`
- Server at `http://localhost:3001`

#### Option 2: Individual Services

**React App Only:**
```bash
npm run dev
```
Access at: `http://localhost:5173`

**Server Only (TypeScript):**
```bash
cd server && npm run dev
```
Server runs at: `http://localhost:3001`

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev:full
   ```

2. **Make Changes**
   - Edit React components in `src/`
   - Modify server logic in `server/`
   - Update Firebase functions in `functions/`

3. **Test Changes**
   - Browser auto-reloads for React changes
   - Server restarts for TypeScript changes
   - Functions recompile on save

4. **Debug Issues**
   - Check browser console for frontend errors
   - Monitor server terminal for backend issues
   - Use Firebase Console for database problems

## 🚀 Firebase Deployment

### Build & Deploy Commands

```bash
# Build the frontend
npm run build

# Deploy only hosting (no functions)
npm run firebase:deploy:hosting

# Deploy database rules only
npm run firebase:deploy:database

# Deploy hosting and database (no functions)
npm run firebase:deploy:all

# Build and deploy hosting in one command
npm run build:firebase
```

### Manual Deployment

#### Step 1: Build the Application
```bash
# Build React app
npm run build

# Build Firebase functions
cd functions && npm run build && cd ..
```

#### Step 2: Deploy to Firebase
```bash
# Deploy hosting and database
firebase deploy --only hosting,database

# Deploy only hosting
firebase deploy --only hosting

# Deploy database rules
firebase deploy --only database
```

### Production Environment Variables

Set Firebase environment variables for production:
```bash
firebase functions:config set \
  cloudinary.name="your_cloudinary_name" \
  cloudinary.api_key="your_api_key" \
  cloudinary.secret="your_secret" \
  razorpay.key_id="your_key_id" \
  razorpay.key_secret="your_key_secret"
```

## 📚 API Documentation

### Server Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

#### Drivers
- `GET /api/drivers` - Get all drivers
- `POST /api/drivers` - Create new driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

#### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `GET /api/bookings/:id/tracking` - Get booking tracking

#### Upload
- `POST /api/upload-image` - Upload image to Cloudinary

#### Payments
- `POST /api/payment/create` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment

### Firebase Functions

#### Driver Location Tracking
- `updateDriverLocation` - Update driver GPS location
- `shareDriverLocation` - Share location with customer
- `getDriverLocation` - Get driver current location

#### Booking Management
- `createBooking` - Create new booking
- `updateBookingStatus` - Update booking status
- `assignDriver` - Assign driver to booking

#### Notifications
- `sendNotification` - Send push notification
- `updateCustomer` - Update customer details


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Copyright Notice

```
Copyright (c) 2026 LogiTech Logistics Management System
```

---

**Built with ❤️ by the My Team**




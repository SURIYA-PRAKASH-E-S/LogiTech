# LogiTech Server

Node.js/Express TypeScript server for LogiTech Logistics Management System. Handles file uploads, payment processing, and API endpoints.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Environment variables

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## � Usage Examples

### Development Workflow
```bash
# 1. Start development mode with hot reload
npm run dev

# 2. Or start with file watching
npm run dev:watch

# 3. Full stack development (from parent directory)
cd .. && npm run dev:full
```

**Development Output:**
```
🚀 Server running in DEVELOPMENT mode
📝 Environment variables loaded from: /path/to/.env
🚀 DEVELOPMENT SERVER STARTED
📡 Server running on port 3001
🔗 Health check: http://localhost:3001/health
📤 Upload endpoint: http://localhost:3001/api/upload-image
💳 Payment endpoint: http://localhost:3001/api/razorpay/create-order

🛠️  Development endpoints available:
📝 API Base URL: http://localhost:3001/api
🔄 Hot reload enabled with ts-node

✅ Server is ready to accept requests!
```

### Production Workflow
```bash
# 1. Build TypeScript to JavaScript
npm run build

# 2. Start production server
npm start

# 3. Or build and run in one command
npm run build:run

# 4. Full stack production (from parent directory)
cd .. && npm run prod:full
```

**Production Output:**
```
🏭 Server running in PRODUCTION mode
🏭 PRODUCTION SERVER STARTED
📡 Server running on port 3001
🔗 Health check: http://localhost:3001/health
📤 Upload endpoint: http://localhost:3001/api/upload-image
💳 Payment endpoint: http://localhost:3001/api/razorpay/create-order

✅ Server is ready to accept requests!
```

## �📋 Available Scripts

```bash
# Development Mode
npm run dev          # Start development server with NODE_ENV=development
npm run dev:watch    # Start with file watching and auto-reload
npm run server:dev   # Start development server (from parent directory)

# Production Mode
npm start            # Start production server (requires build first)
npm run prod         # Start production server with NODE_ENV=production
npm run server:prod  # Start production server (from parent directory)

# Build
npm run build        # Build TypeScript to JavaScript
npm run build:run    # Build and run production server
npm run prod:build   # Build and start production server

# Full Stack (from parent directory)
npm run dev:full     # Start React dev + Server dev
npm run prod:full    # Start React preview + Server prod
npm run prod:build   # Build React + Build Server
```

## 🔄 Development vs Production Mode

### Development Mode (NODE_ENV=development)
- 🚀 **Hot reload** with ts-node
- 📝 **Request logging** enabled
- 🐛 **Debug information** in console
- 🔍 **Detailed error messages**
- 📡 **Development endpoints** listed

### Production Mode (NODE_ENV=production)
- 🏭 **Optimized performance**
- 📦 **Compiled JavaScript** (no TypeScript)
- 🔒 **Minimal logging**
- ⚡ **Faster startup**
- 🛡️ **Production-ready security**

### Mode Switching

#### Automatic Mode Detection
The server automatically detects the mode from `NODE_ENV` environment variable:

```bash
# Development mode
NODE_ENV=development npm run dev

# Production mode
NODE_ENV=production npm start
```

#### Environment-Specific Configuration
```env
# .env file
NODE_ENV=development        # or 'production'
PORT=3001
# ... other variables
```

## 🔧 Environment Variables

Create a `.env` file in the root directory (parent folder):

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_secret

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## 🛠️ Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Multer** - File upload handling
- **Cloudinary** - Image storage
- **Razorpay** - Payment processing
- **CORS** - Cross-origin resource sharing

## 📚 API Endpoints

### Health Check
- `GET /health` - Server health status

### File Upload
- `POST /api/upload-image` - Upload image file (multipart/form-data)
- `POST /api/upload` - Upload image (base64 string)

### Payment Processing
- `POST /api/razorpay/create-order` - Create Razorpay order
- `POST /api/razorpay/verify-payment` - Verify Razorpay payment

### Request/Response Examples

#### Upload Image
```bash
curl -X POST \
  http://localhost:3001/api/upload-image \
  -H 'Content-Type: multipart/form-data' \
  -F 'image=@/path/to/image.jpg'
```

#### Create Payment Order
```bash
curl -X POST \
  http://localhost:3001/api/razorpay/create-order \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 1000,
    "currency": "INR"
  }'
```

## 🌐 Deployment

### Vercel Deployment

#### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from server directory
cd server
vercel

# Deploy to production
vercel --prod
```

#### Method 2: Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy server to Vercel"
   git push origin main
   ```

2. **Deploy via Vercel Dashboard**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure settings:
     - **Framework Preset**: `Other`
     - **Root Directory**: `server`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Node.js Version**: `18.x`

3. **Add Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```env
   NODE_ENV=production
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_SECRET=your_cloudinary_secret
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

#### Vercel Configuration (Optional)

Create `vercel.json` in server directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "index.ts": {
      "maxDuration": 10
    }
  }
}
```

### Render Deployment

#### Method 1: Render Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy server to Render"
   git push origin main
   ```

2. **Deploy via Render Dashboard**
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure settings:
     - **Name**: `logitech-server`
     - **Runtime**: `Node`
     - **Root Directory**: `server`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free` or `Starter`
     - **Auto-Deploy**: `Yes`

3. **Add Environment Variables**
   In Render Dashboard → Service → Environment:
   ```env
   NODE_ENV=production
   PORT=3001
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_SECRET=your_cloudinary_secret
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

#### Method 2: Render CLI

```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Deploy
cd server
render deploy
```

#### Render Configuration (Optional)

Create `render.yaml` in server directory:
```yaml
services:
  - type: web
    name: logitech-server
    env: node
    rootDir: server
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
```

### Production Deployment Notes

#### Build Process
Production deployments automatically:
1. **Build TypeScript** to JavaScript (`npm run build`)
2. **Set NODE_ENV=production**
3. **Start compiled server** (`npm start`)
4. **Enable production optimizations**

#### Environment Variables
Production platforms automatically set:
- `NODE_ENV=production`
- Platform-specific URLs and ports

#### Health Checks
Both platforms provide health monitoring:
```bash
# Render Health Check
curl https://your-server-name.onrender.com/health

# Vercel Health Check
curl https://your-server-name.vercel.app/health
```

## 🔍 Monitoring & Health Checks

### Health Endpoints

Both platforms provide health monitoring:

```bash
# Render Health Check
curl https://your-server-name.onrender.com/health

# Vercel Health Check
curl https://your-server-name.vercel.app/health
```

### Expected Response
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading
**Solution**: Ensure `.env` file is in parent directory, not server directory

#### 2. CORS Errors
**Solution**: Server includes CORS middleware, but ensure frontend URL is allowed

#### 3. File Upload Failures
**Solution**: Check Cloudinary credentials and file size limits (5MB max)

#### 4. Payment Processing Errors
**Solution**: Verify Razorpay key ID and secret are correct

### Debug Mode

Enable debug logging:
```bash
# Development
DEBUG=* npm run dev

# Production
DEBUG=* npm start
```

## 📊 Server Architecture

```
server/
├── index.ts           # Main server file
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── README.md          # This file
└── node_modules/       # Installed dependencies
```

### Middleware Stack
1. **CORS** - Enable cross-origin requests
2. **Express JSON** - Parse JSON bodies
3. **Express URLencoded** - Parse form data
4. **Multer** - Handle file uploads
5. **Error Handler** - Global error handling

### Integration Points
- **Frontend**: React app consumes API endpoints
- **Cloudinary**: Image storage and processing
- **Razorpay**: Payment gateway integration
- **Firebase**: Real-time database and auth

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Server

on:
  push:
    branches: [main]
    paths: [server/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd server && npm install
      - name: Deploy to Render/Vercel
        # Add your deployment step here
```

## 📝 License

This server is part of the LogiTech Logistics Management System.

## 🤝 Support

For server-related issues:
- Check the logs in your deployment platform
- Verify environment variables
- Test endpoints locally first
- Check this README for troubleshooting

---

**Last updated**: January 2025

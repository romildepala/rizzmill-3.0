# Rizzmill 3.0 🚀

AI-powered image generation and training platform built with React, Convex, and Fal AI.

## ✨ Features

- **AI Image Generation**: Create stunning images using FLUX LoRA models
- **Custom Model Training**: Train your own LoRA models with personal images
- **Real-time Progress**: Live training progress and status updates
- **User Authentication**: Secure login with Clerk
- **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Convex (serverless database & functions)
- **AI**: Fal AI (image generation & training)
- **Auth**: Clerk
- **Styling**: Tailwind CSS + shadcn/ui

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account
- Fal AI account
- Clerk account

### 1. Clone Repository

```bash
git clone https://github.com/romildepala/rizzmill-3.0.git
cd rizzmill-3.0
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file:

```env
# Convex
VITE_CONVEX_URL=your_convex_deployment_url

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Fal AI (Backend only)
FAL_KEY=your_fal_ai_key
```

### 4. Deploy Convex Backend

```bash
npx convex dev
```

### 5. Start Development Server

```bash
npm run dev
```

## 🎯 Usage

### Training Custom Models

1. **Upload Images**: Select 5-20 high-quality images
2. **Set Parameters**: 
   - Model Name (e.g., "MyStyle")
   - Trigger Word (e.g., "mystyle")
3. **Start Training**: Click "Train Model" and wait for completion
4. **Generate Images**: Use your trained model in the generation tab

### Image Generation

1. **Select Model**: Choose from available LoRA weights
2. **Write Prompt**: Describe the image you want
3. **Generate**: Click "Generate Image" and wait for results

## 🚀 Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option 2: Netlify

```bash
# Build the project
npm run build

# Deploy to Netlify
# Upload the 'dist' folder to Netlify dashboard
```

### Option 3: Railway

```bash
# Connect your GitHub repo to Railway
# Railway will auto-deploy on push
```

## 🔧 Environment Variables

### Frontend (.env.local)
```env
VITE_CONVEX_URL=your_convex_deployment_url
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Backend (Convex Dashboard)
```env
FAL_KEY=your_fal_ai_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## 📁 Project Structure

```
rizzmill-3.0/
├── convex/                 # Backend functions
│   ├── training.ts        # AI training actions
│   ├── generations.ts     # Image generation
│   └── schema.ts          # Database schema
├── src/                   # Frontend
│   ├── App.tsx           # Main application
│   └── components/       # React components
├── public/               # Static assets
└── package.json          # Dependencies
```

## 🔒 Security

- Environment variables are properly configured
- API keys are stored securely in Convex
- User authentication via Clerk
- CORS and security headers configured

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the code comments
- **Community**: Join our Discord server

---

**Built with ❤️ using modern web technologies**

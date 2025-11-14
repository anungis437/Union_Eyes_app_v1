# UnionEyes - Union Claims Management System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

A modern, production-ready union claims management platform built with Next.js 14, featuring AI-powered assistance, email notifications, file management, and comprehensive workflow automation.

---

## 🎯 Overview

UnionEyes is an enterprise-grade claims management system designed specifically for labor unions. It provides end-to-end claim lifecycle management, from submission through resolution, with built-in AI assistance and automated notifications.

### Key Features

- **📊 Dashboard** - Real-time metrics and claim status tracking
- **🤖 AI Workbench** - Multi-provider AI assistance (Claude, GPT-4, Gemini)
- **📝 Claims Management** - Full CRUD with advanced filtering and search
- **🔄 Workflow Engine** - Automated state transitions with audit trails
- **📧 Email Notifications** - Resend integration for status updates
- **📎 File Management** - Vercel Blob Storage for evidence and documents
- **🔐 Authentication** - Clerk for secure user management
- **🎨 Modern UI** - ShadCN components with Tailwind CSS

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router, React Server Components) |
| **Styling** | Tailwind CSS, ShadCN UI, Framer Motion |
| **Backend** | Supabase (PostgreSQL) with Drizzle ORM |
| **Auth** | Clerk |
| **AI** | OpenAI, Anthropic Claude, Google Gemini |
| **Email** | Resend with React Email templates |
| **Storage** | Vercel Blob Storage |
| **Deployment** | Vercel |

---

## 📋 Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- PostgreSQL database (Supabase)
- Clerk account for authentication
- Vercel Blob Storage account
- Resend account for email

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/anungis437/union-claims-standalone.git
cd union-claims-standalone

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Visit `http://localhost:3000`

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` with the following:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://user:pass@host/database"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="UnionEyes <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron Jobs
CRON_SECRET="your-secret-key"

# AI Services (Optional)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GOOGLE_API_KEY="..."
```

See `.env.example` for complete configuration.

---

## 📁 Project Structure

```
UnionEyes/
├── app/                    # Next.js 14 App Router
│   ├── (dashboard)/       # Dashboard layout group
│   │   ├── dashboard/     # Main dashboard page
│   │   ├── claims/        # Claims management pages
│   │   ├── members/       # Member management
│   │   └── workbench/     # AI workbench interface
│   ├── api/               # API routes
│   │   ├── claims/        # Claims CRUD endpoints
│   │   ├── dashboard/     # Dashboard stats
│   │   ├── upload/        # File upload endpoints
│   │   └── notifications/ # Email notifications
│   └── layout.tsx         # Root layout
│
├── lib/                    # Core business logic
│   ├── workflow-engine.ts # Claim lifecycle management
│   ├── email-service.ts   # Email sending with Resend
│   ├── email-templates.tsx # React Email components
│   └── db/                # Database configuration
│
├── components/            # React components
│   ├── ui/               # ShadCN UI primitives
│   ├── claims/           # Claims components
│   ├── dashboard/        # Dashboard components
│   └── workbench/        # AI workbench components
│
├── database/             # Database schema and migrations
│   ├── schema/          # Drizzle schema definitions
│   └── migrations/      # SQL migration files
│
├── packages/             # Monorepo packages
│   ├── ai/              # AI integration package
│   ├── auth/            # Authentication utilities
│   ├── supabase/        # Supabase client
│   └── types/           # Shared TypeScript types
│
└── docs/                # Documentation
    ├── PHASE_1_PROGRESS.md
    ├── PHASE_1_NEXT_STEPS.md
    ├── AI_IMPLEMENTATION_SUMMARY.md
    ├── AI_API_TESTING_GUIDE.md
    ├── AI_QUICK_START.md
    └── RESPONSIBLE_AI.md
```

---

## 🎨 Features Deep Dive

### Dashboard
- Real-time claim statistics
- Status distribution charts
- Recent activity feed
- Quick action buttons

### Claims Management
- Create, read, update, delete claims
- Advanced filtering (status, type, date range)
- Full-text search with pagination
- File attachments via Vercel Blob
- Complete audit trail

### AI Workbench
- Multi-provider AI chat interface
- Context-aware responses
- Model switching (Claude, GPT-4, Gemini)
- Conversation history
- Markdown rendering
- Responsible AI guidelines

### Workflow Engine
- Status transition validation
- Automated audit logging
- Email notifications on status changes
- Configurable workflow rules
- Member and steward assignment

### Email Notifications
- Professional HTML templates
- Status change notifications
- Member and steward alerts
- Mobile-responsive design
- React Email components

---

## 📊 Development Status

**Current Phase**: Phase 1 Foundation Complete

✅ **Completed:**
1. Dashboard Integration
2. Claims Management
3. AI Workbench Integration
4. File Upload Infrastructure
5. Workflow Engine
6. Email Notifications System
7. Namespace Migration (@unioneyes)
8. AI Infrastructure & Documentation

🚧 **In Progress:**
- Members Page Integration
- CSV Import Feature
- Comprehensive Testing

See [PHASE_1_NEXT_STEPS.md](./PHASE_1_NEXT_STEPS.md) for next steps.

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Manual Testing
- Dashboard: Verify metrics and charts
- Claims: Test CRUD operations
- AI Workbench: Test chat functionality
- File Upload: Test upload/download
- Email: Verify notification delivery

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

```bash
# Deploy with Vercel CLI
vercel
```

### Environment Setup
- **Database**: Supabase PostgreSQL
- **Storage**: Vercel Blob Storage
- **Email**: Resend
- **Auth**: Clerk (production instance)
- **AI**: OpenAI / Anthropic / Google

---

## 📖 Documentation

- **[AI Implementation Summary](./AI_IMPLEMENTATION_SUMMARY.md)** - AI features overview
- **[AI Quick Start](./AI_QUICK_START.md)** - Getting started with AI
- **[AI API Testing Guide](./AI_API_TESTING_GUIDE.md)** - API endpoint testing
- **[Responsible AI](./RESPONSIBLE_AI.md)** - AI ethics and guidelines
- **[Phase 1 Next Steps](./PHASE_1_NEXT_STEPS.md)** - Development roadmap
- **[Azure Deployment](./AZURE_DEPLOYMENT.md)** - Azure setup guide

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Create an issue](https://github.com/anungis437/union-claims-standalone/issues)
- **Email**: support@unioneyes.com

---

## 🎯 Roadmap

### Phase 2 (Q1 2026)
- Member management interface
- CSV bulk import
- Advanced reporting and analytics
- Multi-language support (EN/FR/ES)
- Voice-to-text claim submission

### Phase 3 (Q2 2026)
- Advanced analytics dashboard
- Integration with union management systems
- Grievance arbitration workflow
- Automated document generation (PDFs)
- SMS notifications

### Phase 4 (Future)
- Mobile app (React Native)
- Predictive analytics
- AI-powered case recommendations
- Advanced search with semantic matching
- Real-time collaboration features

---

**Built with ❤️ for labor unions**

# UnionEyes - Union Claims Management System# CodeSpring Boilerplate



A modern, production-ready union claims management platform built with Next.js 14, featuring AI-powered workbench, email notifications, file management, and comprehensive workflow automation.A modern full-stack starter built with Next.js 14, Tailwind CSS, ShadCN UI, Supabase, Drizzle ORM, Clerk authentication and Stripe payments.



![License](https://img.shields.io/badge/license-MIT-blue.svg)---

![Next.js](https://img.shields.io/badge/Next.js-14-black)

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)## 📬 Need help?

If you get stuck or spot an issue, reach out at **usecodespring@gmail.com** – we’re happy to help!

---

---

## 🎯 Overview

## Table of Contents

UnionEyes is an enterprise-grade claims management system designed specifically for labor unions. It provides end-to-end claim lifecycle management, from submission through resolution, with built-in AI assistance and automated notifications.1. [Why CodeSpring Boilerplate?](#why-codespring-boilerplate)

2. [Tech Stack](#tech-stack)

### Key Features3. [Prerequisites](#prerequisites)

4. [Getting Started](#getting-started)

- **📊 Dashboard** - Real-time metrics and claim status tracking   1. [Clone & Detach From This Repository](#clone--detach-from-this-repository)

- **🤖 AI Workbench** - Multi-provider AI assistance (Claude, GPT-4, Gemini)   2. [Install Dependencies](#install-dependencies)

- **📝 Claims Management** - Full CRUD with advanced filtering and search   3. [Configure Environment Variables](#configure-environment-variables)

- **🔄 Workflow Engine** - Automated state transitions with audit trails   4. [Run Locally](#run-locally)

- **📧 Email Notifications** - Resend integration for status updates5. [Deployment](#deployment)

- **📎 File Management** - Vercel Blob Storage for evidence and documents6. [Project Structure](#project-structure)

- **🔐 Authentication** - Clerk for secure user management7. [Troubleshooting](#troubleshooting)

- **🎨 Modern UI** - ShadCN components with Tailwind CSS8. [License](#license)



------



## 🚀 Quick Start## Why CodeSpring Boilerplate?

CodeSpring Boilerplate gives you everything you need to launch a production-ready SaaS or internal tool:

### Prerequisites

- 📦 **Batteries included** – Auth, payments, database & UI are pre-wired.

- Node.js 18+ or Bun- 🖌 **Beautiful UI** – ShadCN + Tailwind ensures design consistency.

- pnpm (recommended) or npm- 💨 **Fast iteration** – Opinionated file structure and conventions.

- PostgreSQL database (Azure or local)- 🚀 **Deploys to Vercel** in minutes.

- Clerk account for authentication

- Vercel Blob Storage account---



### Installation## Tech Stack

| Layer | Technology |

```bash|-------|------------|

# Clone the repository| **Frontend** | Next.js 14 (App Router, React Server Components) |

git clone https://github.com/anungis437/union-claims-standalone.git| **Styling** | Tailwind CSS, ShadCN UI, Framer Motion |

cd union-claims-standalone/UnionEyes| **Backend** | Supabase (PostgreSQL) with Drizzle ORM |

| **Auth** | Clerk |

# Install dependencies| **Payments** | Stripe |

pnpm install| **Deployment** | Vercel |



# Set up environment variables---

cp .env.example .env.local

# Edit .env.local with your credentials## Prerequisites

Before you begin make sure you have:

# Run database migrations

pnpm db:push1. **Node.js ≥ 18**

   - Recommended: install via [nvm](https://github.com/nvm-sh/nvm) so you can switch versions easily.

# Start development server2. **Git** and a **GitHub** account.

pnpm dev3. **Supabase** account (free tier ok).

```4. **Clerk** account.

5. **Stripe** account.

Visit `http://localhost:3000`6. **Vercel** account.



---> Tip: All listed services have free plans – you can build and test without spending a cent.



## 📁 Project Structure### Optional CLI Tools

- [Supabase CLI](https://supabase.com/docs/guides/cli) – database migrations & local dev.

```- [Vercel CLI](https://vercel.com/cli) – deploy from terminal.

UnionEyes/

├── app/                    # Next.js 14 App Router---

│   ├── (dashboard)/       # Dashboard layout group

│   │   ├── dashboard/     # Main dashboard page## Getting Started

│   │   ├── claims/        # Claims management pages### 1. Clone & Detach From This Repository

│   │   ├── members/       # Member management (planned)```bash

│   │   └── workbench/     # AI workbench interface# Clone the boilerplate (creates a new folder "codespring-boilerplate")

│   ├── api/               # API routesgit clone https://github.com/CodeSpringHQ/codespring-boilerplate.git

│   │   ├── claims/        # Claims CRUD endpointscd codespring-boilerplate

│   │   ├── dashboard/     # Dashboard stats endpoints

│   │   ├── upload/        # File upload endpoints# Remove the existing Git remote so you can connect your own repo

│   │   ├── notifications/ # Email notification endpointsgit remote remove origin

│   │   └── cron/          # Scheduled job endpoints

│   └── layout.tsx         # Root layout# Create a brand-new repository on GitHub (via web UI or gh CLI) then add it:

│git remote add origin https://github.com/<your-username>/<your-repo>.git

├── lib/                    # Core business logic

│   ├── workflow-engine.ts # Claim lifecycle managementgit push -u origin main

│   ├── email-service.ts   # Email sending with Resend```

│   ├── email-templates.tsx # React Email components

│   ├── claim-notifications.ts # Notification integration### 2. Install Dependencies

│   └── db/                # Database configurationWe use **npm** by default – feel free to swap for **pnpm** or **yarn**.

│```bash

├── components/            # React components# Make sure you are using Node ≥ 18

│   ├── ui/               # ShadCN UI primitivesnode -v

│   ├── claims/           # Claims-specific components

│   ├── dashboard/        # Dashboard components# Install packages

│   └── workbench/        # AI workbench componentsnpm install

│```

├── database/             # Database schema and migrations

│   ├── schema/          # Drizzle schema definitions### 3. Configure Environment Variables

│   └── migrations/      # SQL migration filesCopy the example file and fill in the blanks:

│```bash

└── docs/                # Documentationcp .env.example .env.local

    ├── PHASE_1_PROGRESS.md        # Development progress```

    ├── TASK_*_COMPLETE.md         # Task completion docsOpen `.env.local` and provide the following keys:

    └── archive/                    # Historical documentation

``````bash

# Database (Supabase)

---DATABASE_URL="postgresql://<user>:<password>@db.<project>.supabase.co:6543/postgres"



## 🔧 Tech Stack# Auth (Clerk)

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."

### FrontendCLERK_SECRET_KEY="sk_..."

- **Next.js 14** - React framework with App RouterNEXT_PUBLIC_CLERK_SIGN_IN_URL=/login

- **TypeScript** - Type-safe developmentNEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

- **Tailwind CSS** - Utility-first styling

- **ShadCN UI** - High-quality component library# Payments (Stripe)

- **Framer Motion** - AnimationsSTRIPE_SECRET_KEY="sk_live_..."

- **React Hook Form** - Form managementSTRIPE_WEBHOOK_SECRET="whsec_..."

- **Zod** - Schema validationNEXT_PUBLIC_STRIPE_PORTAL_LINK="https://billing.stripe.com/p/session/..."

NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY="https://buy.stripe.com/..."

### BackendNEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY="https://buy.stripe.com/..."

- **PostgreSQL** - Primary database (Azure)```

- **Drizzle ORM** - Type-safe database queries

- **Clerk** - Authentication and user management> Keep `.env.local` **private** – never commit it to Git!

- **Vercel Blob** - File storage

- **Resend** - Transactional emails### 4. Run Locally

- **React Email** - Email templates```bash

npm run dev

### AI Integration# Visit http://localhost:3000

- **Anthropic Claude** - Primary AI model```

- **OpenAI GPT-4** - Alternative AI model

- **Google Gemini** - Additional AI option---



### Development## Deployment

- **pnpm** - Fast, disk-efficient package manager1. Push your code to GitHub (see step 1).

- **ESLint** - Code linting2. Log into [Vercel](https://vercel.com/) and **Import Project**.

- **Prettier** - Code formatting3. During setup, add the same environment variables from `.env.local` to Vercel.

- **Jest** - Unit testing (configured)4. Click **Deploy** – Vercel will build and deploy your app.



---> Supabase URL and anon/public keys can be safely exposed to the client; secrets (service role, database password) must stay server-side.



## ⚙️ Configuration---



### Environment Variables## Project Structure

```

Create `.env.local` with the following:.

├── actions/           # Server actions

```bash├── app/               # Next.js app router structure

# Database├── components/        # UI components (ShadCN based)

DATABASE_URL="postgresql://user:pass@host/database"├── db/                # Drizzle config & migrations

├── lib/               # Utility helpers

# Clerk Authentication└── ...

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."```

CLERK_SECRET_KEY="sk_test_..."Key conventions:

NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"- **/components** – name files like `example-component.tsx`.

NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"- **/actions** – name files like `example-actions.ts`.

- **/db/schema** – database table schemas.

# Vercel Blob Storage- **/db/queries** – reusable query files.

BLOB_READ_WRITE_TOKEN="vercel_blob_..."

---

# Email (Resend)

RESEND_API_KEY="re_..."## Troubleshooting

EMAIL_FROM="UnionEyes <noreply@yourdomain.com>"| Issue | Fix |

EMAIL_REPLY_TO="support@yourdomain.com"|-------|-----|

NEXT_PUBLIC_APP_URL="http://localhost:3000"| `Module not found` after install | Try deleting `node_modules` & `package-lock.json`, then `npm install` again. |

| Clerk fails locally | Ensure the **publishable key** starts with `pk_` and matches your Clerk instance’s frontend API. |

# Cron Jobs| Supabase connection errors | Check `DATABASE_URL` format and that your IP is allowed if using direct connections. |

CRON_SECRET="your-secret-key"| Stripe webhooks not firing locally | Use [`stripe listen`](https://stripe.com/docs/cli) or a tunnelling tool like [ngrok](https://ngrok.com/). |



# AI Services (Optional)If none of these solve your problem, email **usecodespring@gmail.com** with logs and a description of the issue.

ANTHROPIC_API_KEY="sk-ant-..."

OPENAI_API_KEY="sk-..."---

GOOGLE_API_KEY="..."

```## License

Distributed under the MIT License. See [`LICENSE`](license) for more information.

See `.env.example` for complete configuration.

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
- Full-text search
- Pagination support
- File attachments
- Audit trail

### AI Workbench
- Multi-provider AI chat interface
- Context-aware responses
- Model switching (Claude, GPT-4, Gemini)
- Conversation history
- Markdown rendering

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
- Scheduled overdue reminders (planned)
- Mobile-responsive design

---

## 📊 Phase 1 Progress

**Status**: 7/11 Tasks Complete (64%)

✅ **Completed:**
1. Branch Setup
2. Dashboard Integration
3. Claims Page Integration
4. AI Workbench Integration
5. File Upload Infrastructure
6. Workflow Engine
7. Email Notifications

🚧 **In Progress:**
8. Members Page Integration
9. CSV Import Feature
10. End-to-End Tests
11. Testing Phase 1 Features

See [PHASE_1_PROGRESS.md](./PHASE_1_PROGRESS.md) for detailed status.

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
Follow the comprehensive checklist in [TASK_11_TESTING_CHECKLIST.md](./TASK_11_TESTING_CHECKLIST.md)

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
- Database: Azure PostgreSQL (staging/production)
- Storage: Vercel Blob Storage
- Email: Resend
- Auth: Clerk (production instance)

---

## 📖 Documentation

- **[Phase 1 Progress](./PHASE_1_PROGRESS.md)** - Development status and timeline
- **[Task 5: File Upload](./TASK_5_FILE_UPLOAD_COMPLETE.md)** - File management implementation
- **[Task 7: Email Notifications](./TASK_7_EMAIL_NOTIFICATIONS_COMPLETE.md)** - Email system details
- **[Testing Checklist](./TASK_11_TESTING_CHECKLIST.md)** - Manual testing guide
- **[Schema Documentation](./database/schema/)** - Database schema definitions

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

### Phase 2 (Upcoming)
- Member management interface
- CSV bulk import
- Advanced reporting
- Mobile app (React Native)
- Multi-language support (EN/FR/ES)
- Voice-to-text claim submission

### Phase 3 (Future)
- Advanced analytics dashboard
- Integration with union management systems
- Grievance arbitration workflow
- Document generation (PDFs)
- SMS notifications

---

**Built with ❤️ for labor unions**

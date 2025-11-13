# UnionEyes Configuration Summary

## Repository Setup
- **Repository renamed**: `codespring-boilerplate` → `UnionEyes`
- **Package name updated**: `prompting-test-project` → `unioneyes`
- All branding updated from CodeSpring to UnionEyes

## Supabase Configuration

### Connection Details
- **Project URL**: https://lzwzyxayfrbdpmlcltjd.supabase.co
- **Host**: aws-1-ca-central-1.pooler.supabase.com
- **Port**: 6543
- **Database**: postgres
- **User**: postgres.lzwzyxayfrbdpmlcltjd
- **Password**: -Eg$xtag82CfrGF
- **Pool Mode**: transaction

### API Keys
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6d3p5eGF5ZnJiZHBtbGNsdGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MzAxNDQsImV4cCI6MjA3ODQwNjE0NH0.77zFYCSmSPagKNcF0MXa38s3DJ51LYv2Foq_l7SZ8NE
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6d3p5eGF5ZnJiZHBtbGNsdGpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjgzMDE0NCwiZXhwIjoyMDc4NDA2MTQ0fQ.o7zZrK_tunO4Ixr6jcCl2lp94fMVYQUWzKfgTdIhNMc

### Connection String
```
postgresql://postgres.lzwzyxayfrbdpmlcltjd:-Eg$xtag82CfrGF@aws-1-ca-central-1.pooler.supabase.com:6543/postgres
```

### psql Command
```bash
psql -h aws-1-ca-central-1.pooler.supabase.com -p 6543 -d postgres -U postgres.lzwzyxayfrbdpmlcltjd
```

## Environment File
All Supabase credentials have been configured in `.env.local`

## Clerk Authentication Setup ✅

### Configuration Complete
- **Clerk SDK**: @clerk/nextjs v5.3.7 installed
- **Middleware**: Using `clerkMiddleware()` from `@clerk/nextjs/server`
- **Layout**: Wrapped with `<ClerkProvider>` and authentication UI components
- **Environment Variables**: Configured in `.env.local`

### Clerk Keys
- **Publishable Key**: pk_test_a25vd24taGFnZmlzaC02Ny5jbGVyay5hY2NvdW50cy5kZXYk
- **Secret Key**: sk_test_CgTyrzrO1CazAU5AGQvOkq7OyybHaWwzMS4g3DUoQA

### Authentication Features
- Sign In/Sign Up buttons in header
- User button for authenticated users
- Protected routes (dashboard)
- Automatic profile creation on first login

## Next Steps
1. ✅ Install dependencies: `npm install` - COMPLETED
2. ✅ Set up Clerk authentication keys in `.env.local` - COMPLETED
3. Run database migrations: `npm run db:migrate`
4. ✅ Start development server: `npm run dev` - RUNNING at http://localhost:3000

## Python Database Connection Example
```python
import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = "postgres.lzwzyxayfrbdpmlcltjd"
PASSWORD = "-Eg$xtag82CfrGF"
HOST = "aws-1-ca-central-1.pooler.supabase.com"
PORT = "6543"
DBNAME = "postgres"

# Connect to the database
try:
    connection = psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT,
        dbname=DBNAME
    )
    print("Connection successful!")
    
    cursor = connection.cursor()
    cursor.execute("SELECT NOW();")
    result = cursor.fetchone()
    print("Current Time:", result)

    cursor.close()
    connection.close()
    print("Connection closed.")

except Exception as e:
    print(f"Failed to connect: {e}")
```

## Required Dependencies for Python
```bash
pip install python-dotenv psycopg2
```

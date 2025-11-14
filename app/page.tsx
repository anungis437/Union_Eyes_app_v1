/**
 * Root page - redirects to dashboard if authenticated
 * Note: This is a minimal redirect page. The actual marketing page is at app/(marketing)/page.tsx
 * which Next.js serves at the root path when there's a (marketing) route group
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { userId } = auth();
  
  // If user is authenticated, redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }
  
  // Otherwise redirect to marketing page
  redirect("/marketing");
}

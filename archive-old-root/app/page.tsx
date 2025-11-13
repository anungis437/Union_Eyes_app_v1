/**
 * Root page - redirects to dashboard if authenticated, otherwise shows marketing page
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MarketingPage from "./(marketing)/page";

export default async function RootPage() {
  const { userId } = auth();
  
  // If user is authenticated, redirect to dashboard
  if (userId) {
    redirect("/dashboard");
  }
  
  // Otherwise, show marketing page
  return <MarketingPage />;
}

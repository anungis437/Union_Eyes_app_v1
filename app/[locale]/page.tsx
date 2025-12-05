/**
 * Locale-prefixed root page - redirects to login
 * Auth checking happens in middleware, so we just redirect to login
 * which will redirect to dashboard if already authenticated
 */
import { redirect } from "next/navigation";

export default function LocaleRootPage({
  params: { locale }
}: {
  params: { locale: string };
}) {
  // Always redirect to login - Clerk middleware will handle auth and redirect to dashboard if logged in
  redirect(`/${locale}/login?redirect_url=/${locale}/dashboard`);
}

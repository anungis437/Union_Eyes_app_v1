/**
 * Root page - redirects to locale-prefixed routes
 * Detects user's locale and redirects accordingly
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { defaultLocale } from '@/i18n';

export default async function RootPage() {
  // Get user's preferred locale from Accept-Language header
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language');
  
  // Simple locale detection (can be enhanced)
  let locale = defaultLocale;
  if (acceptLanguage?.includes('fr')) {
    locale = 'fr-CA';
  }
  
  // Redirect to locale-prefixed route
  redirect(`/${locale}`);
}

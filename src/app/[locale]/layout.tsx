import {NextIntlClientProvider}from 'next-intl';
import {getMessages}from 'next-intl/server';
import { AuthProvider } from '@/context/AuthContext';

export function generateStaticParams() {
  return [
    { locale: 'es' },
    { locale: 'en' },
    { locale: 'fr' },
    { locale: 'ca' }
  ];
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <AuthProvider>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </AuthProvider>
  );
}
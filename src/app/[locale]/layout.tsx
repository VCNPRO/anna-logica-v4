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
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <AuthProvider>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </AuthProvider>
  );
}
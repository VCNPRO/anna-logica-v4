import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'ca', 'eu', 'gl', 'de', 'fr', 'it'] as const;
export const defaultLocale = 'es';

export default getRequestConfig(async ({ locale }) => {
  const currentLocale: string =
    locale && locales.includes(locale as any) ? locale : defaultLocale;

  return {
    locale: currentLocale,
    messages: (await import(`./messages/${currentLocale}.json`)).default
  } as const; // <- fuerza a TS a verlo como tipos literales
});
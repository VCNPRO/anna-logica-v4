'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales } from '../../i18n';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { user } = useAuth();
  const t = useTranslations('Header');

  const handleLocaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    const newPath = `/${newLocale}${pathname.substring(3)}`;
    router.push(newPath);
  };

  const handleSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 text-white shadow-md sticky top-0 z-10"> 
      <h1 className="text-2xl font-bold text-blue-400">anna-logica</h1> 
      <div className="flex items-center gap-4">
        <select 
          onChange={handleLocaleChange} 
          value={currentLocale}
          className="bg-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"> 
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {locale.toUpperCase()}
            </option>
          ))}
        </select>
        {user && (
          <div className="flex items-center gap-2"> 
            <span className="text-sm text-gray-300">{user.email}</span>
            <button 
              onClick={handleSignOut}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors"> 
              {t('signOutButton')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
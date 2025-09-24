import React from 'react';
import { useTranslations } from 'next-intl';

export function Sidebar() {
  const t = useTranslations('Sidebar');

  return (
    <aside className="w-64 p-4 border-r border-gray-700 bg-gray-800 text-white shadow-lg flex flex-col h-screen"> 
      <div className="mb-8 text-left"> 
        <h2 className="text-2xl font-bold text-white">anna-logica</h2> 
        <p className="text-sm text-gray-400">IA para el procesamiento inteligente de documentos</p>
      </div>
      <nav className="flex-grow"> 
        <ul>
          <li className="mb-2"> 
            <a href="#" className="flex items-center p-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"> 
              <span className="mr-3">🏠</span> 
              {t('homeLink')}
            </a>
          </li>
          <li className="mb-2">
            <a href="#" className="flex items-center p-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
              <span className="mr-3">📁</span>
              {t('filesLink')}
            </a>
          </li>
          <li className="mb-2">
            <a href="#" className="flex items-center p-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
              <span className="mr-3">⚙️</span>
              {t('settingsLink')}
            </a>
          </li>
        </ul>
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700 text-center text-sm text-gray-500">
        Anna Lógica © 2025
      </div>
    </aside>
  );
}
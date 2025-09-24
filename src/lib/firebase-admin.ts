import * as admin from 'firebase-admin';

// IMPORTANTE: Necesitas configurar las credenciales de servicio de Firebase
// 1. Ve a la consola de Firebase -> Configuración del proyecto -> Cuentas de servicio
// 2. Genera una nueva clave privada y descarga el archivo JSON.
// 3. No guardes el archivo JSON directamente en el código. En su lugar, usa variables de entorno.
//    Crea un archivo .env.local en la raíz de tu proyecto y añade:
//    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//    FIREBASE_CLIENT_EMAIL="tu-service-account-email@...iam.gserviceaccount.com"
//    FIREBASE_PROJECT_ID="tu-project-id"

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Reemplaza \n con saltos de línea reales
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      // Opcional: añade la URL de tu base de datos si es necesario
      // databaseURL: '<TU_PROJECT_ID>.firebaseio.com',
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export default admin;

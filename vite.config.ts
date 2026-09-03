import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Chemins relatifs pour les assets : permet d'ouvrir dist/index.html
    // directement (file://) ou de déployer sur un sous-chemin sans page blanche.
    base: './',
    // Expose au bundle client les variables d'environnement VITE_* et les
    // variables publiques NEXT_PUBLIC_* (dont NEXT_PUBLIC_kym_* fournies par
    // l'intégration plateforme). Le préfixe `kym_` seul est volontairement
    // EXCLU : il porterait des secrets (service_role) dans le bundle client.
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user asking them to refresh
    if (confirm('Nova versão disponível! Deseja atualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline!');
  },
  onRegistered(registration) {
    console.log('Service Worker registrado:', registration);
  },
  onRegisterError(error) {
    console.error('Erro ao registrar Service Worker:', error);
  }
});

export { updateSW };

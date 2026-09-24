import { CustomNotification } from '../types';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface BrowserInfo {
  isAndroid: boolean;
  isOpera: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isNativeAndroid: boolean;
  name: 'Android Nativo' | 'Opera' | 'Chrome' | 'Safari' | 'Outro';
}

class NotificationService {
  constructor() {
    // Inicializa canal nativo se estiver rodando no Android Studio / APK nativo
    if (Capacitor.isNativePlatform()) {
      this.initNativeChannel();
    }

    // Escuta o evento de que a biblioteca do Median está pronta (se estiver empacotado)
    if (typeof window !== 'undefined') {
      window.addEventListener('gonative_library_ready', () => {
        this.requestPermission();
      });
    }
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  private async initNativeChannel() {
    try {
      await LocalNotifications.createChannel({
        id: 'rota_alerts',
        name: 'Alertas RotaFinanceira',
        description: 'Notificações de metas diárias batidas e alertas de manutenção',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#4f46e5'
      });
    } catch (e) {
      console.warn('Erro ao configurar canal nativo de notificações:', e);
    }
  }

  getBrowserInfo(): BrowserInfo {
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (typeof window === 'undefined') {
      return { isAndroid: false, isOpera: false, isChrome: false, isSafari: false, isNativeAndroid, name: 'Outro' };
    }
    const ua = navigator.userAgent;
    const isAndroid = isNativeAndroid || /Android/i.test(ua);
    const isOpera = /OPR\/|Opera|OPT\/|OPRGX/i.test(ua);
    const isChrome = !isNativeAndroid && !isOpera && /Chrome|CriOS/i.test(ua);
    const isSafari = !isNativeAndroid && !isOpera && !isChrome && /Safari/i.test(ua);
    return {
      isAndroid,
      isOpera,
      isChrome,
      isSafari,
      isNativeAndroid,
      name: isNativeAndroid ? 'Android Nativo' : isOpera ? 'Opera' : isChrome ? 'Chrome' : isSafari ? 'Safari' : 'Outro'
    };
  }

  private callMedian(url: string) {
    if (typeof document === 'undefined') return;
    const medianUrl = url.replace('gonative://', 'median://');
    const iframe1 = document.createElement('iframe');
    iframe1.setAttribute('src', url);
    iframe1.setAttribute('style', 'display: none;');
    document.documentElement.appendChild(iframe1);

    const iframe2 = document.createElement('iframe');
    iframe2.setAttribute('src', medianUrl);
    iframe2.setAttribute('style', 'display: none;');
    document.documentElement.appendChild(iframe2);

    setTimeout(() => {
      if (iframe1.parentNode) iframe1.parentNode.removeChild(iframe1);
      if (iframe2.parentNode) iframe2.parentNode.removeChild(iframe2);
    }, 500);
  }

  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    if (typeof window === 'undefined') return false;
    return 'Notification' in window || 'serviceWorker' in navigator || !!((window as any).gonative || (window as any).median);
  }

  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      return Notification.permission;
    } catch {
      return 'unsupported';
    }
  }

  async checkPermissionStatus(): Promise<NotificationPermission | 'unsupported'> {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') return 'granted';
        if (perm.display === 'denied') return 'denied';
        return 'default';
      } catch {
        return 'default';
      }
    }
    return this.getPermissionStatus();
  }

  async requestPermission(): Promise<{ granted: boolean; status: NotificationPermission | 'unsupported'; error?: string }> {
    // 1. Android Nativo (Capacitor / Android Studio / POST_NOTIFICATIONS)
    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeChannel();
        const perm = await LocalNotifications.requestPermissions();
        const isGranted = perm.display === 'granted';
        return {
          granted: isGranted,
          status: isGranted ? 'granted' : 'denied'
        };
      } catch (e: any) {
        console.error('Erro solicitando permissão nativa do Android:', e);
        return {
          granted: false,
          status: 'denied',
          error: e?.message || 'Falha ao solicitar permissão nativa do Android'
        };
      }
    }

    const isMedian = typeof window !== 'undefined' && !!((window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative'));
    
    if (isMedian) {
      try {
        if ((window as any).gonative?.oneSignal) {
          (window as any).gonative.oneSignal.register();
        }
        this.callMedian('gonative://onesignal/register');
        return { granted: true, status: 'granted' }; 
      } catch (e: any) {
        console.error('Erro OneSignal:', e);
      }
    }

    // Suporte para Notificações padrão de navegador (Opera Android, Chrome Android, Desktop, Safari, Edge)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        let permission: NotificationPermission;
        // Alguns navegadores mais antigos só suportam callback
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission(resolve);
          });
        }

        return {
          granted: permission === 'granted',
          status: permission
        };
      } catch (e: any) {
        console.error('Erro pedindo permissão de notificação nativa:', e);
        return {
          granted: false,
          status: this.getPermissionStatus(),
          error: e?.message || 'Falha ao solicitar permissão'
        };
      }
    }

    return {
      granted: false,
      status: 'unsupported',
      error: 'Seu navegador não tem suporte à API de Notificações'
    };
  }

  async sendNotification(title: string, options?: NotificationOptions): Promise<{ success: boolean; error?: string }> {
    // 1. Android Nativo via Capacitor LocalNotifications
    if (Capacitor.isNativePlatform()) {
      try {
        const notifId = Math.floor(Math.random() * 900000) + 100000;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title,
              body: options?.body || '',
              channelId: 'rota_alerts',
              schedule: { at: new Date(Date.now() + 150) }
            }
          ]
        });
        return { success: true };
      } catch (err: any) {
        console.error('Erro ao enviar notificação nativa do Android:', err);
        return { success: false, error: err?.message || 'Falha ao disparar notificação nativa' };
      }
    }

    const isMedian = typeof window !== 'undefined' && !!((window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative'));
    
    if (isMedian) {
      const titleEnc = encodeURIComponent(title);
      const bodyEnc = encodeURIComponent(options?.body || '');
      this.callMedian(`gonative://notifications/create?title=${titleEnc}&body=${bodyEnc}`);
      return { success: true };
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, error: 'Notificações não suportadas neste navegador.' };
    }

    const currentPerm = this.getPermissionStatus();
    if (currentPerm !== 'granted') {
      return { 
        success: false, 
        error: currentPerm === 'denied' 
          ? 'Notificações estão bloqueadas no navegador. Altere nas configurações do site.' 
          : 'Permissão de notificação ainda não foi concedida.' 
      };
    }

    // Usa sempre ícones locais na mesma origem para não ser bloqueado pelo bloqueador de anúncios do Opera
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const iconUrl = `${origin}/icon-192.png`;

    const notifOptions: NotificationOptions = {
      body: options?.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: 'rotafinanceira-notif',
      ...options
    };

    // No Android (Opera e Chrome), chamar `new Notification(...)` gera "TypeError: Illegal constructor".
    // É OBRIGATÓRIO disparar via ServiceWorkerRegistration.showNotification().
    if ('serviceWorker' in navigator) {
      try {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js');
        }

        // Tenta obter o worker com timeout para evitar travamento em navegadores móveis
        const swReadyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<ServiceWorkerRegistration | null>((resolve) => 
          setTimeout(() => resolve(reg || null), 1500)
        );

        const targetReg = (await Promise.race([swReadyPromise, timeoutPromise])) || reg;

        if (targetReg && 'showNotification' in targetReg) {
          await targetReg.showNotification(title, notifOptions);
          return { success: true };
        }
      } catch (swErr) {
        console.warn('Erro ao disparar via Service Worker, tentando fallback:', swErr);
      }
    }

    // Fallback para navegadores que suportam o construtor direto
    try {
      new Notification(title, notifOptions);
      return { success: true };
    } catch (e: any) {
      console.error('Falha ao instanciar notificação:', e);
      return { success: false, error: e?.message || 'Falha ao exibir notificação no navegador.' };
    }
  }

  // Mantido para compatibilidade com tipos existentes
  checkAndTriggerCustomNotifications(_customNotifications: CustomNotification[]) {
    // Agendador opcional
  }

  getDebugInfo() {
    return {
      browser: this.getBrowserInfo(),
      isSupported: this.isSupported(),
      permission: this.getPermissionStatus()
    };
  }
}

export const notificationService = new NotificationService();

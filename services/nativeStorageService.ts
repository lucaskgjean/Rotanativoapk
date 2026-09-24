import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface StoragePermissionStatus {
  granted: boolean;
  state: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unsupported';
}

class NativeStorageService {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async checkStoragePermissions(): Promise<StoragePermissionStatus> {
    if (!this.isNative()) {
      return { granted: true, state: 'granted' };
    }

    try {
      const status = await Filesystem.checkPermissions();
      const isGranted = status.publicStorage === 'granted';
      return {
        granted: isGranted,
        state: status.publicStorage || 'prompt'
      };
    } catch (e) {
      console.warn('Erro checando permissões de armazenamento nativo:', e);
      return { granted: true, state: 'granted' };
    }
  }

  async requestStoragePermissions(): Promise<StoragePermissionStatus> {
    if (!this.isNative()) {
      return { granted: true, state: 'granted' };
    }

    try {
      const status = await Filesystem.requestPermissions();
      const isGranted = status.publicStorage === 'granted';
      return {
        granted: isGranted,
        state: status.publicStorage || 'prompt'
      };
    } catch (e) {
      console.error('Erro solicitando permissões de armazenamento nativo:', e);
      return { granted: false, state: 'denied' };
    }
  }

  /**
   * Salva um arquivo no dispositivo.
   * Se for Android Nativo (Capacitor), salva na pasta Documentos do aparelho.
   * Se for Navegador/PWA, faz o download padrão do browser.
   */
  async exportFile(filename: string, content: string, mimeType: string = 'text/plain'): Promise<{ success: boolean; uri?: string; error?: string }> {
    if (this.isNative()) {
      try {
        // Assegura permissões
        await this.requestStoragePermissions();

        const result = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        return {
          success: true,
          uri: result.uri
        };
      } catch (err: any) {
        console.error('Erro salvando arquivo no sistema de arquivos nativo:', err);
        // Fallback: tenta salvar no Cache se a pasta Documentos falhar
        try {
          const cacheResult = await Filesystem.writeFile({
            path: filename,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });
          return { success: true, uri: cacheResult.uri };
        } catch (cacheErr: any) {
          return { success: false, error: err?.message || 'Falha ao gravar arquivo nativo' };
        }
      }
    }

    // Fallback Web / PWA padrão
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 500);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao exportar no navegador' };
    }
  }
}

export const nativeStorageService = new NativeStorageService();

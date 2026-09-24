import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface StoragePermissionStatus {
  granted: boolean;
  state: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unsupported';
}

export interface ExportOptions {
  share?: boolean;
  title?: string;
  text?: string;
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
      console.warn('Permissão de armazenamento gerenciada via Scoped Storage:', e);
      return { granted: true, state: 'granted' };
    }
  }

  /**
   * Salva um arquivo de texto/JSON/CSV no dispositivo.
   * Se for Android Nativo (Capacitor), salva na pasta Documentos e Cache, e opcionalmente abre o menu nativo de compartilhamento do Android.
   * Se for Navegador/PWA, faz o download padrão do browser.
   */
  async exportFile(
    filename: string, 
    content: string, 
    mimeType: string = 'text/plain',
    options?: ExportOptions
  ): Promise<{ success: boolean; uri?: string; error?: string }> {
    if (this.isNative()) {
      try {
        await this.requestStoragePermissions();

        // 1. Salva na pasta Cache para compartilhamento garantido com outras aplicações
        const cacheResult = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        // 2. Salva também cópia persistente na pasta Documentos do dispositivo
        let docUri = cacheResult.uri;
        try {
          const docResult = await Filesystem.writeFile({
            path: filename,
            data: content,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          });
          docUri = docResult.uri;
        } catch (docErr) {
          console.warn('Erro secundário ao salvar em Documentos (usando Cache):', docErr);
        }

        // 3. Se solicitado compartilhamento (padrão true para backups no mobile), abre a folha de compartilhamento nativa do Android
        if (options?.share !== false) {
          try {
            await Share.share({
              title: options?.title || 'Rota Financeira',
              text: options?.text || `Arquivo: ${filename}`,
              url: cacheResult.uri,
              dialogTitle: options?.title || 'Salvar ou Compartilhar Arquivo'
            });
          } catch (shareErr: any) {
            // Se o usuário apenas fechou a janela de compartilhamento, não é erro de exportação
            if (shareErr?.name !== 'AbortError') {
              console.warn('Aviso no compartilhamento nativo:', shareErr);
            }
          }
        }

        return {
          success: true,
          uri: docUri
        };
      } catch (err: any) {
        console.error('Erro salvando arquivo no sistema de arquivos nativo:', err);
        return { success: false, error: err?.message || 'Falha ao gravar arquivo nativo' };
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

      // Se o navegador suportar Web Share API e for pedido share
      if (options?.share && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: mimeType });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: options?.title || 'Rota Financeira',
              text: options?.text || filename
            });
          }
        } catch (shareErr) {
          // ignora cancelamento
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao exportar no navegador' };
    }
  }

  /**
   * Salva e compartilha um arquivo binário (Base64) como PDF ou imagem PNG no Android nativo.
   */
  async shareBinaryFile(
    filename: string,
    base64Data: string,
    mimeType: string,
    title: string = 'Compartilhar',
    text: string = ''
  ): Promise<{ success: boolean; uri?: string; error?: string }> {
    if (this.isNative()) {
      try {
        await this.requestStoragePermissions();

        // Grava no Cache do app (onde o FileProvider tem acesso seguro para compartilhar)
        const saved = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });

        // Abre o menu nativo de compartilhamento do Android (WhatsApp, Drive, Gmail, etc.)
        await Share.share({
          title,
          text,
          url: saved.uri,
          dialogTitle: title
        });

        return { success: true, uri: saved.uri };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: true };
        }
        console.error('Erro ao compartilhar arquivo binário no Android:', err);
        return { success: false, error: err?.message || 'Erro no compartilhamento nativo' };
      }
    }

    return { success: false, error: 'Método apenas disponível na plataforma nativa' };
  }
}

export const nativeStorageService = new NativeStorageService();

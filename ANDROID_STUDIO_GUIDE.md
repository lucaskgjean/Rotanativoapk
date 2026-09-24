# Guia de Exportação e Lançamento no Android Studio 🚀

O **RotaFinanceira** agora está 100% preparado como projeto nativo do Android utilizando a infraestrutura oficial do **Capacitor**.

---

## 📁 Estrutura do Projeto Android

A pasta `/android` na raiz deste projeto é um projeto nativo completo do Android Studio, contendo:
- `android/app/src/main/AndroidManifest.xml`: Configurado com todas as permissões nativas necessárias.
- `android/app/src/main/java/com/rotafinanceira/app/MainActivity.java`: Activity principal nativa.
- `android/app/build.gradle`: Configuração de SDKs (Compile SDK 34, Min SDK 24, Target SDK 34).
- `capacitor.config.ts`: Definição de ID de aplicativo (`com.rotafinanceira.app`), esquemas e plugins nativos.

---

## 🔔 1. Permissões Nativas de Notificação (Android 13+)

No Android 13 (API 33) e versões superiores, é obrigatória a permissão `POST_NOTIFICATIONS`.
- **No `AndroidManifest.xml`**:
  - `android.permission.POST_NOTIFICATIONS`
  - `android.permission.VIBRATE`
  - `android.permission.WAKE_LOCK`
  - `android.permission.RECEIVE_BOOT_COMPLETED`
  - `android.permission.SCHEDULE_EXACT_ALARM`
- **No Código**:
  - O serviço `notificationService.ts` utiliza `@capacitor/local-notifications` para solicitar a janela nativa de permissão do Android (`requestPermissions()`).
  - Cria automaticamente o canal de notificações de alta prioridade (`rota_alerts`) para alertas de meta batida e manutenções.
  - Na tela de **Configurações > Notificações**, há botão dedicado para testar o envio de notificação nativa com vibração e ícone.

---

## 💾 2. Permissões de Armazenamento e Exportação de Arquivos

- **No `AndroidManifest.xml`**:
  - `android.permission.READ_EXTERNAL_STORAGE` (maxSdkVersion 32)
  - `android.permission.WRITE_EXTERNAL_STORAGE` (maxSdkVersion 29)
  - `android.permission.READ_MEDIA_IMAGES`
- **No Código**:
  - Criado o serviço `nativeStorageService.ts`.
  - Ao clicar em **Exportar Planilha (CSV)** ou **Criar Backup Completo (JSON)**, o aplicativo salva o arquivo diretamente na pasta **Documentos** (`Directory.Documents`) do aparelho Android.
  - Se acessado no navegador comum ou PWA, o aplicativo mantém o fallback suave de download via navegador.
  - Na tela de **Configurações > Armazenamento & Exportação**, há um card com o status da permissão e botão para solicitá-la diretamente.

---

## 🔙 3. Controle Adaptado do Botão Voltar (Hardware / Gesture Back)

No Android nativo, os usuários navegam frequentemente pelo botão físico/virtual de voltar ou pelo gesto de deslizar a borda da tela:
1. **Modais e Diálogos**: Se algum diálogo de confirmação ou modal de edição estiver aberto, o botão voltar **fecha o modal**.
2. **Abas Secundárias**: Se o usuário estiver em Despesas, Manutenção, Ponto, Relatórios, Histórico ou Configurações, o botão voltar **retorna para o Início (Dashboard)**.
3. **Rolagem**: Se o usuário estiver no Dashboard mas tiver rolado a tela para baixo, o botão voltar **sobe suavemente para o topo**.
4. **Duplo Toque para Sair**: Se o usuário já estiver no topo do Início, o primeiro toque avisa: *"Pressione voltar novamente para sair"*. Se pressionado novamente em até 2,5 segundos, o app fecha com segurança (`CapApp.exitApp()`), seguindo as diretrizes de UX da Google Play.

---

### ⚠️ ATENÇÃO SE VOCÊ CLONOU DIRETO DO GITHUB

Se você clonou o repositório diretamente pelo GitHub / Android Studio e a opção de gerar APK **não aparece**, é por 2 motivos normais:
1. **Pasta Aberta Incorreta**: O Android Studio abriu a pasta raiz do repositório em vez da subpasta `/android`. O Android Studio só reconhece o projeto como app Android quando você abre a pasta `android`.
2. **Dependências Ausentes**: O GitHub não salva pastas como `node_modules` nem arquivos compilados da web (`dist`). É necessário rodar o comando de sincronização antes.

---

## 🛠️ Como Abrir e Compilar no Android Studio

### Passo 1: Instalar Dependências e Gerar o Build Web
No terminal do seu computador (no VS Code ou terminal comum, dentro da pasta do projeto):
```bash
npm install
npm run build:android
```
> Esse comando instala o Capacitor e compila todo o código React/TypeScript, gerando a pasta `android/app/src/main/assets/public`.

### Passo 2: Abrir a pasta CORRETA no Android Studio
1. No Android Studio, vá em **File > Close Project** (se já estiver aberto).
2. Na tela inicial (ou em **File > Open...**):
3. Navegue até a pasta do projeto e selecione **ESPECIFICAMENTE a pasta `android`** (você verá o ícone do robozinho verde do Android ao lado dela).
4. Clique em **OK / Open**.
5. Aguarde o Android Studio realizar a sincronização inicial do Gradle (**Gradle Sync** na barra inferior).

### Passo 3: Executar em um Emulador ou Celular Físico
- Conecte seu celular Android via cabo USB (com a *Depuração USB* ativada) ou selecione um Emulador (Virtual Device).
- Clique no botão verde de **Run ▶** (Shift + F10) na barra superior do Android Studio.

### Passo 4: Gerar o APK ou Pacote AAB para a Google Play
1. No Android Studio, vá em **Build > Generate Signed Bundle / APK...**
2. Escolha:
   - **Android App Bundle (.aab)** se for publicar na **Google Play Store**.
   - **APK (.apk)** se for instalar diretamente no aparelho ou enviar para testes.
3. Crie ou selecione sua chave de assinatura (Keystore) e selecione a variante de build **release**.
4. Clique em **Create** e seu instalador pronto estará gerado!

---

## 🔄 Como Atualizar o App Nativo após Modificações no Código
Sempre que fizer alterações no código React/TypeScript, basta rodar:
```bash
npm run build:android
```
E no Android Studio, clicar em **Run ▶** novamente.



## Plano: Melhorar Instalação PWA na TV

### Problema
O prompt de instalação aparece na TV, mas o navegador da TV não suporta o evento `beforeinstallprompt` de forma confiável, impossibilitando a instalação automática. O usuário precisa de uma forma prática de ter o app na tela inicial da TV.

---

### Solução: Abordagem em 3 Frentes

#### 1. Instruções Passo-a-Passo Específicas por Navegador

Melhorar o componente `PWAInstallPrompt.tsx` para detectar qual navegador a TV está usando e mostrar instruções específicas:

- **Chrome (Android TV)**: Menu (3 pontos) > "Adicionar à tela inicial"
- **Puffin TV**: Menu > "Criar atalho"
- **TV Browser / WebOS / Tizen**: Instruções adaptadas

Incluir imagens/ícones ilustrativos para cada passo, facilitando para qualquer pessoa seguir.

#### 2. QR Code no Painel Admin

Adicionar um gerador de QR Code na página do Dashboard e na página `/tv-config` que aponta diretamente para a URL `/tv`. Assim o usuário pode:
- Abrir a câmera do celular
- Escanear o QR Code
- Enviar o link para a TV via Cast ou simplesmente digitar uma vez

#### 3. Otimizar start_url do PWA

Mudar o `start_url` no manifest para `/tv`, para que quando o app for instalado na TV, ele abra diretamente na interface otimizada para TV (sem precisar navegar manualmente).

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/PWAInstallPrompt.tsx` | Instruções detalhadas por navegador com visual melhorado |
| `src/pages/TVPreparation.tsx` | Adicionar QR Code com URL da TV |
| `src/pages/Dashboard.tsx` | Adicionar QR Code na aba de configurações |
| `vite.config.ts` | Alterar `start_url` para `/tv` |

### Detalhes Técnicos

**QR Code**: Usar uma biblioteca leve de geração de QR Code no lado do cliente (ex: `qrcode.react`) ou gerar via API gratuita (`https://api.qrserver.com/v1/create-qr-code/`).

**Detecção de navegador na TV**: Expandir a função `isAndroidTV()` para identificar o navegador específico (Chrome, Puffin, WebView) e ajustar as instruções.

**Manifest otimizado**: Adicionar `categories: ["entertainment"]` e `display_override: ["standalone", "fullscreen"]` para melhor compatibilidade com TVs Android.

---

### Resultado Esperado

- Instruções claras e visuais para instalar na TV, adaptadas ao navegador usado
- QR Code disponível no painel admin para facilitar o acesso à URL da TV
- Quando instalado, o app abre direto na tela da TV sem precisar digitar URL
- Qualquer pessoa consegue seguir os passos sem conhecimento técnico


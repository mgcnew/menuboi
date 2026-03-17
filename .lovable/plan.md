

## Plano: Melhorias de UX, Performance e Robustez

Implementar 4 melhorias (excluindo autenticação e itens de baixa prioridade):

---

### 1. Barra de Progresso no Upload (Alta)

**Arquivo: `src/components/ImageUpload.tsx`**
- Adicionar estado `uploadProgress` (arquivo atual / total) e `compressionInfo` (tamanho original vs comprimido)
- Mostrar barra de progresso (`Progress` component) durante upload com texto "Enviando 2/5..."
- Após compressão, mostrar badge com economia: "5.2MB → 380KB (-93%)"
- Aplicar mesma lógica no `AudioUpload.tsx` e `AnnouncementUpload.tsx` (progresso por arquivo)

**Arquivos:** `ImageUpload.tsx`, `AudioUpload.tsx`, `AnnouncementUpload.tsx`

---

### 2. Dark Mode no Dashboard (Média)

**Arquivo: `src/pages/Dashboard.tsx`**
- Adicionar botão toggle (Sun/Moon) no header ao lado do botão "Abrir Slideshow"
- Usar `localStorage` para persistir preferência
- Aplicar classe `dark` no `<html>` element via `document.documentElement.classList`

**Arquivo: `src/index.css`**
- O tema `.dark` já existe com variáveis CSS definidas (linhas 93-129), então o toggle já vai funcionar com as cores certas sem precisar adicionar mais CSS.

**Arquivos:** `Dashboard.tsx` (toggle + lógica)

---

### 3. Cache Offline no Service Worker (Média)

**Arquivo: `vite.config.ts`**
- Expandir `runtimeCaching` do Workbox para incluir estratégia **CacheFirst** específica para URLs de storage (imagens/áudio), separada da estratégia NetworkFirst existente para API
- Adicionar cache dedicado `media-cache` com limite de 200 entradas e 7 dias de expiração
- Manter `NetworkFirst` para chamadas de API (dados dinâmicos)

```text
Estratégia:
API calls (supabase REST) → NetworkFirst (atual)
Storage media (images/audio) → CacheFirst (novo)
```

**Arquivos:** `vite.config.ts`

---

### 4. Reconexão Automática do Realtime (Média)

**Arquivo: `src/pages/Slideshow.tsx`**
- Monitorar estado do canal Realtime via callbacks `subscribe(status)`
- Ao detectar desconexão (`CHANNEL_ERROR` ou `TIMED_OUT`), reconectar com backoff exponencial (2s, 4s, 8s, max 30s)
- Adicionar indicador visual discreto: ponto verde/vermelho no canto inferior direito (visível apenas com controles ativos)
- Ao reconectar com sucesso, fazer `loadData()` para sincronizar conteúdo perdido durante a desconexão

**Arquivos:** `Slideshow.tsx`

---

### Resumo de Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/ImageUpload.tsx` | Barra de progresso + info de compressão |
| `src/components/AudioUpload.tsx` | Barra de progresso |
| `src/components/AnnouncementUpload.tsx` | Barra de progresso |
| `src/pages/Dashboard.tsx` | Toggle dark mode no header |
| `vite.config.ts` | CacheFirst para mídia no Service Worker |
| `src/pages/Slideshow.tsx` | Reconexão automática + indicador de status |


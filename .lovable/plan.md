

## Plano: Auto-reload completo ao alterar músicas, locuções ou imagens

### Problema Atual
O Realtime só escuta mudanças em `menu_items` e `slideshow_settings`. Não escuta `audio_tracks`, `announcements` nem `playlist_tracks`. Quando você adiciona/remove músicas ou locuções, a TV não atualiza.

### Solução

**Arquivo: `src/pages/Slideshow.tsx`**

Expandir o listener Realtime para escutar **todas as 5 tabelas relevantes**:
- `menu_items` (imagens/vídeos)
- `audio_tracks` (músicas)
- `announcements` (locuções)
- `playlist_tracks` (composição das playlists)
- `slideshow_settings` (configurações)

Quando qualquer uma dessas tabelas mudar, chamar `loadData()` com debounce de 2s, que já recarrega tudo (imagens, áudios, locuções). O slideshow continua rodando automaticamente após o reload porque `isPlaying` permanece `true`.

Garantir que o `currentIndex` seja resetado para 0 quando as imagens mudarem (evitar index out of bounds).

**Arquivo: `src/components/AudioPlayer.tsx`**

Quando as props `tracks` ou `announcements` mudarem (já tratado pelo useEffect existente que reconstrói a playlist), garantir que o player reinicie a reprodução automaticamente com a nova playlist, sem parar.

### Mudanças Concretas

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Slideshow.tsx` | Adicionar listeners Realtime para `audio_tracks`, `announcements`, `playlist_tracks` |
| `src/components/AudioPlayer.tsx` | Garantir restart automático quando playlist muda |

Mudanças pequenas e focadas — apenas expandir o que já funciona para cobrir todas as tabelas.


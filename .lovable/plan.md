

## Plano: Recarregar TV automaticamente ao alterar conteúdo

### Situação Atual
Hoje o Realtime detecta mudanças nas tabelas (`menu_items`, `audio_tracks`, `announcements`, `playlist_tracks`) com debounce de 2s e chama `loadData()` em background. O problema é que essa atualização "silenciosa" às vezes não reflete bem na tela — especialmente porque o slideshow já está em loop, vídeos podem estar tocando, e o estado interno (`currentIndex`, layers de crossfade) pode ficar dessincronizado com a nova lista.

### Solução: Reload completo da página

Quando o Realtime detectar mudança em fotos, músicas ou locuções, forçar um `window.location.reload()` ao invés de apenas recarregar dados em memória. Isso garante:
- Estado 100% limpo
- Nova lista de mídia carregada do zero
- Sem conflitos de transição/buffer
- Comportamento previsível e idêntico ao "F5"

### Detalhes técnicos

**Arquivo: `src/pages/Slideshow.tsx`**

1. **Manter** o debounce de 2s (evita reload em rajada quando vários uploads acontecem juntos)
2. **Trocar** `loadData()` por `window.location.reload()` no callback do Realtime para as tabelas de conteúdo (`menu_items`, `audio_tracks`, `announcements`, `playlist_tracks`)
3. **Manter** `loadSettings()` sem reload para `slideshow_settings` (mudanças visuais leves não precisam recarregar tudo)
4. **Adicionar** um pequeno overlay visual ("Atualizando...") que aparece nos 2 segundos antes do reload, para feedback ao usuário caso esteja olhando para a TV
5. **Proteção**: salvar timestamp do último reload em `sessionStorage` para evitar loop de reload caso algo dispare repetidamente (mínimo 5s entre reloads)

```text
Fluxo:
Upload de imagem no Dashboard
  → Supabase INSERT em menu_items
  → Realtime dispara evento na TV
  → Debounce 2s (caso venham mais)
  → Mostra overlay "Atualizando..."
  → window.location.reload()
  → TV volta com novo conteúdo
```

### Comportamento esperado

| Ação no Dashboard | Comportamento na TV |
|---|---|
| Adicionar/remover imagem | Reload completo após 2s |
| Adicionar/remover música | Reload completo após 2s |
| Adicionar/remover locução | Reload completo após 2s |
| Reordenar playlist | Reload completo após 2s |
| Alterar tema/widgets | Atualização suave sem reload |

### Arquivo modificado

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Slideshow.tsx` | Trocar `loadData()` por `window.location.reload()` no Realtime + overlay visual + proteção contra loop |


# Mudança no comportamento de áudio

Hoje as faixas de música e locuções tocam alternadas (uma locução, uma música, etc). A nova lógica será:

- As **músicas tocam continuamente**, uma após a outra (consecutivo, em shuffle/loop).
- A cada **X minutos** (configurável no painel), uma **locução** é disparada.
- Quando a locução começa, o volume da música **reduz suavemente** (fade out parcial / "ducking").
- Ao terminar a locução, o volume da música **sobe suavemente** de volta ao normal.
- A música nunca para — ela continua tocando por baixo da locução em volume baixo.

## Comportamento detalhado

1. Player de música roda em loop infinito (shuffle das tracks).
2. Um timer dispara a próxima locução a cada `intervaloLocucao` minutos.
3. Ao disparar:
   - Música faz fade do volume atual (ex: 0.45) para um volume reduzido (ex: 0.08) ao longo de ~800ms.
   - Locução começa a tocar em volume cheio (1.0) num segundo elemento `<audio>`.
4. Ao terminar a locução (evento `ended`):
   - Música faz fade de 0.08 de volta para 0.45 ao longo de ~800ms.
   - Timer reinicia para a próxima locução.
5. Locuções também rodam em ordem (shuffle) sem repetir até esgotar a lista.

## Configuração nova

Adicionar no painel de Configurações da Slideshow:
- **Intervalo entre locuções** (em minutos, ex: 1–60, padrão 5).
- (Opcional) **Volume da música durante locução** (slider 0–50%, padrão 15%).
- (Opcional) **Duração do fade** (em ms, padrão 800).

Se quiser, posso manter só o intervalo e deixar fade/volume fixos para simplificar.

## Detalhes técnicos

- Refatorar `src/components/AudioPlayer.tsx`:
  - Usar **dois elementos `<audio>`**: um para música (`musicRef`), outro para locução (`announcementRef`).
  - Remover lógica de playlist intercalada em `createPlaylist`; criar duas filas separadas.
  - Música: ao `ended`, avança para próxima track; ao esgotar, re-shuffle e recomeça.
  - Locução: disparada por `setInterval` (ou `setTimeout` recursivo) baseado no intervalo configurado.
  - Função `fadeVolume(audio, from, to, duration)` usando `requestAnimationFrame` para suavidade.
  - Estado `isDucking` para evitar conflitos se o timer disparar enquanto outra locução ainda toca.
- Persistência da configuração: adicionar coluna `announcement_interval_minutes` (e opcionalmente `announcement_duck_volume`, `announcement_fade_ms`) na tabela `slideshow_settings` via migração.
- Atualizar `SlideshowSettings` em `src/types/slideshow.ts`, `DEFAULT_SLIDESHOW_SETTINGS`, e `SlideshowSettingsCard.tsx` com o novo controle (input numérico ou slider).
- Passar o intervalo como prop para o `AudioPlayer`.

## Pergunta antes de implementar

Quer que eu exponha **apenas o intervalo** (mais simples) ou também os controles de **volume reduzido** e **duração do fade**?

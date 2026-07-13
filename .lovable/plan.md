## Problema

Hoje o áudio usa apenas `audio.volume` de cada `<audio>`. Isso tem dois problemas:

1. **Cada MP3 tem loudness diferente.** Uma música masterizada mais alta toca estourada, outra mais baixa quase some — mesmo com o mesmo volume configurado. O player não normaliza nada.
2. **Toda vez que qualquer configuração muda** (intervalo, volume, tema), o `useEffect` principal de `AudioPlayer` re-executa, re-embaralha as filas e reinicia a música do começo. Isso faz o volume/faixa "pular" sem motivo aparente.
3. **Sem limiter/compressor**, picos de faixas mais dinâmicas soam agressivos, e faixas quietas ficam abafadas depois do ducking.

## Solução

Introduzir uma cadeia **Web Audio API** por cima dos `<audio>` existentes, mantendo toda a lógica atual de fila/ducking/locução:

```text
<audio música>       ──► MediaElementSource ──► GainNode(música) ──┐
                                                                   ├─► GainNode(master) ─► Compressor/Limiter ─► destino
<audio locução>      ──► MediaElementSource ──► GainNode(locução) ─┘
```

- **GainNode por canal** substitui o controle de `audio.volume`. Fades e ducking passam a acontecer no GainNode (via `gain.linearRampToValueAtTime`), que é sample-accurate e não sofre com o clamp 0–1 dos elementos HTML.
- **DynamicsCompressorNode** no master funciona como limiter: threshold ≈ −6 dB, ratio 12, attack 3 ms, release 250 ms. Isso evita que uma música masterizada alta estoure e ao mesmo tempo dá "corpo" às mais baixas, deixando o volume percebido mais consistente entre faixas — é a mesma técnica que rádios usam.
- **Auto-ganho leve por faixa (opcional, barato):** ao começar cada música, medir o pico do primeiro segundo com um `AnalyserNode` e aplicar um trim de ±6 dB no GainNode da música para aproximar a loudness média. Se preferir manter simples, o limiter sozinho já resolve a maior parte da queixa; deixo esse passo atrás de um flag interno para ligarmos depois.

## Correções paralelas de estabilidade

Enquanto mexo no player, corrijo o que hoje causa "reinícios" percebidos como oscilação:

1. **Separar init de props reativas** em `AudioPlayer`:
   - `useEffect` de inicialização depende **apenas** de `tracks` e `announcements` (por id, não por referência), então mudar volume/intervalo no painel **não reinicia a música**.
   - Volumes atualizam o `GainNode` correspondente com um ramp de 200 ms (sem clique).
   - Intervalo de locução só reprograma o próximo `setTimeout`, sem tocar na fila da música.
2. **Ducking com ramp linear no GainNode** em vez do `requestAnimationFrame` manual — mais suave e imune a frames perdidos na TV.
3. **Guard de autoplay**: se o `play()` inicial falhar por bloqueio do navegador, mostrar um botão discreto "Ativar áudio" (aparece só quando necessário) e retomar automaticamente após o primeiro clique/tecla em qualquer lugar da tela — assim o dono da TV não precisa esperar a locução silenciosa passar.
4. **Handler de erro de faixa** com pequeno backoff (já existe, mas hoje pode entrar em loop se todas as faixas falharem): parar após 3 falhas seguidas e logar.

## Detalhes técnicos

- `src/components/AudioPlayer.tsx`:
  - Novo hook interno `useAudioGraph()` que cria `AudioContext` (lazy, no primeiro `play`), dois `MediaElementAudioSourceNode`, dois `GainNode`, um `GainNode` master e um `DynamicsCompressorNode`. Guardar refs para reutilização.
  - Substituir `fadeVolume` por `rampGain(gainNode, target, ms)` usando `gain.cancelScheduledValues` + `linearRampToValueAtTime`.
  - `audio.volume` permanece em `1.0` (o volume real vive no GainNode). `audio.muted` continua controlando mute global.
  - Split do `useEffect` grande em três: (a) init de filas e primeira play — depende só de `tracks.map(t=>t.id).join()` e idem para announcements; (b) sync de volume — depende de `musicVolume`, `announcementVolume`, `musicDuckVolume`; (c) sync de intervalo — depende de `announcementIntervalMinutes`.
  - Detecção de bloqueio de autoplay: capturar rejeição do primeiro `play()` e expor `needsUserGesture` no estado local.
- **Nada muda** em `AudioSettingsCard.tsx`, tipos, tabela `slideshow_settings`, ou no `Slideshow.tsx` que hospeda o player.

## Fora de escopo

- Não mexer em transições de imagem, marquee, temas ou qualquer outra área — só áudio.
- Não adicionar novos controles no painel (compressor/limiter fica com valores fixos bons para ambiente comercial).

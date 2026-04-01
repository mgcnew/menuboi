

## Plano: Simplificar Transições do Slideshow

### Problema Identificado

O sistema dual-buffer atual tem um bug de sincronização: quando `activeBuffer` e `currentIndex` mudam no mesmo render, o buffer "entrante" ainda não tem a imagem carregada, causando frames em branco e travamentos. A lógica nas linhas 389-403 é complexa e frágil — buffer 1 mostra `current` ou `nextImage` dependendo de qual buffer está ativo, mas ambos referenciam o mesmo `currentIndex`.

### Solução: Crossfade Simples com Dois Layers

Reescrever o sistema de transição com uma abordagem mais simples e confiável:

```text
Layer A: imagem atual (opacity 1)
Layer B: próxima imagem (opacity 0, pré-carregando)

Ao avançar:
  1. Garantir que Layer B já carregou a imagem
  2. Fade Layer B para opacity 1
  3. Após transição CSS acabar, trocar papéis (B vira A)
```

### Mudanças no arquivo `src/pages/Slideshow.tsx`

1. **Remover** sistema dual-buffer (`activeBuffer`, `bufferReady`, swap logic)
2. **Adicionar** dois refs persistentes: `currentUrl` e `nextUrl` (strings, não índices)
3. **Pré-carregar** a próxima imagem no layer oculto via `<img>` nativo com `onLoad`
4. **Crossfade** apenas quando `onLoad` da próxima imagem dispara — nunca mostra imagem não carregada
5. **Transição CSS**: `opacity` com `duration-700 ease-in-out` — suave e sem animações complexas
6. **Fallback**: se imagem não carrega em 8s, pula para a seguinte
7. **Simplificar** `renderMedia` — sem keys dinâmicas, sem lógica condicional de buffer

### Resultado Esperado

- Imagens sempre aparecem já carregadas (nunca flash branco)
- Transição suave de fade, sem travamentos
- Código mais simples e fácil de manter
- Vídeos continuam funcionando normalmente

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Slideshow.tsx` | Reescrever sistema de transição (crossfade simples) |


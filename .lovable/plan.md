

## Plano: Corrigir e Melhorar Sistema de Dias da Semana

### Diagnóstico

Analisei o código e o banco. A lógica de filtro em `Slideshow.tsx` (linha 57-58) está **correta**:
```ts
displayDays === null || displayDays.length === 0 || displayDays.includes(today)
```

Hoje (sábado) todas as 25 imagens no banco têm `display_days = NULL` (todos os dias), por isso aparecem todas. **O filtro funciona**, mas há 4 problemas reais que provavelmente causaram a confusão no teste anterior:

| # | Problema | Impacto |
|---|---------|---------|
| 1 | Filtro não atualiza à meia-noite — se a TV ficar ligada de quinta para sexta, continua mostrando imagens de quinta até reload | Alto |
| 2 | Dashboard não mostra **qual dia é hoje** nem **quais mídias tocariam hoje** — impossível verificar a configuração | Alto |
| 3 | `SlideshowPreview` (sidebar) mostra **todas** as imagens, ignorando filtro de dia → causa impressão de que "não filtrou" | Médio |
| 4 | `new Date().getDay()` usa timezone do dispositivo — se a TV estiver em UTC, vira o dia 3h antes | Médio |

### Soluções

**1. `src/pages/Slideshow.tsx` — Atualização automática à meia-noite**
- Adicionar `useEffect` com `setTimeout` calculado para os próximos 00:00:01 do dispositivo
- Ao disparar, re-roda o filtro de `allImages` (re-executa o effect existente forçando refresh) e re-agenda para próximo dia
- Garante troca automática mesmo sem reload

**2. `src/pages/Dashboard.tsx` — Header com dia atual + filtro visual**
- Adicionar badge no header: "Hoje: Sábado" (usando `getCurrentDayOfWeek` + `DAY_OPTIONS`)
- Adicionar contador no card "Resumo": "Tocando hoje: X de Y mídias"
- Na aba Mídia, adicionar um botão de filtro "Ver apenas hoje" que filtra o `ImageGrid` localmente

**3. `src/components/SlideshowPreview.tsx` — Aplicar mesmo filtro**
- Filtrar `images` por `displayDays` antes de renderizar o preview
- Mostrar pequeno aviso "Mostrando X de Y (filtrado por hoje: Sáb)"
- Garante que o que aparece no preview = o que aparece na TV

**4. `src/components/ImageGrid.tsx` — Destaque visual**
- Adicionar opacity 60% ou borda tracejada nas mídias que **não** tocam hoje
- Já existem badges dos dias (linhas 110-122), apenas adicionar estilo visual indicando "não tocará hoje"
- Ajuda usuário a entender rapidamente quais imagens estão programadas para outro dia

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Slideshow.tsx` | Timer para re-filtrar imagens à meia-noite |
| `src/pages/Dashboard.tsx` | Badge "Hoje: X" no header + contador "tocando hoje" no Resumo |
| `src/components/SlideshowPreview.tsx` | Aplicar filtro de dia + indicador visual |
| `src/components/ImageGrid.tsx` | Esmaecer mídias que não tocam hoje |

### Resultado Esperado
- Usuário consegue **ver claramente** no Dashboard qual o dia atual e o que vai tocar
- Preview do Dashboard reflete exatamente o que aparece na TV
- TV troca de programação automaticamente à meia-noite, sem precisar reload
- Mídias não-agendadas para hoje ficam visualmente esmaecidas no grid




## Plano: Agendamento por Dia da Semana + Otimização de Carregamento

### 1. Agendamento por Dia da Semana

**Banco de dados**: Adicionar coluna `display_days` (tipo `text[]`, array de dias) na tabela `menu_items`. Valores possíveis: `['mon','tue','wed','thu','fri','sat','sun']`. Default: todos os dias (null = exibe sempre).

**Dashboard (ImageConfigModal)**: Adicionar seletor de dias da semana com checkboxes no modal de configuração de cada slide. O usuário marca em quais dias aquele slide deve aparecer.

**Dashboard (ImageGrid)**: Mostrar badge com os dias selecionados em cada card.

**Slideshow**: Filtrar as imagens no carregamento, exibindo apenas as que têm o dia atual marcado (ou `null` para "todos os dias").

### 2. Otimização de Carregamento de Imagens

**Preload mais agressivo**: Aumentar de 2 para 3-4 imagens preloaded à frente.

**Dual-buffer rendering**: Manter duas `<img>` tags sobrepostas — a atual visível e a próxima escondida já carregando. Quando avança, troca a visibilidade instantaneamente sem aguardar load.

**Cache persistente**: Não limpar o cache de imagens entre reloads de dados.

**Transição sem bloqueio**: Remover o loader/spinner — sempre mostrar a imagem anterior enquanto a próxima carrega, garantindo que nunca haja tela preta/travada.

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/` | Adicionar coluna `display_days text[]` em `menu_items` |
| `src/pages/Dashboard.tsx` | Passar `display_days` no insert/update |
| `src/components/ImageConfigModal.tsx` | Adicionar seletor de dias da semana |
| `src/components/ImageGrid.tsx` | Badge dos dias no card |
| `src/pages/Slideshow.tsx` | Filtrar por dia atual + dual-buffer rendering |
| `src/types/slideshow.ts` | Constantes de dias |

### Migração SQL

```sql
ALTER TABLE public.menu_items 
ADD COLUMN display_days text[] DEFAULT NULL;
-- NULL = exibe todos os dias
```

### Interface do Seletor de Dias

```text
┌─────────────────────────────────┐
│  Dias de Exibição               │
│  ☑ Seg  ☑ Ter  ☑ Qua  ☑ Qui   │
│  ☑ Sex  ☐ Sáb  ☐ Dom          │
│  ☐ Todos os dias               │
└─────────────────────────────────┘
```

### Lógica de Filtragem no Slideshow

```text
dia_atual = getDayOfWeek() → 'mon'|'tue'|...
imagens_filtradas = imagens.filter(img => 
  img.displayDays === null || img.displayDays.includes(dia_atual)
)
```

### Dual-Buffer no Slideshow

```text
┌─────────────────────────────────┐
│  <img current> (opacity: 1)     │  ← visível
│  <img next>    (opacity: 0)     │  ← carregando em background
│                                 │
│  Ao avançar:                    │
│  - next → opacity: 1 (instant)  │
│  - current vira a próxima       │
└─────────────────────────────────┘
```

Isso elimina qualquer flash/travada pois a próxima imagem já está carregada quando a transição acontece.


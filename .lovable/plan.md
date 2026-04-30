## Plano: Redesign da tela inicial — Novo Boi João Dias

### Objetivos
- **Compactar** os cards (hoje gigantes em TV 1080p / 4K).
- **Remover** todos os gradientes animados (aurora) e blurs pesados — leve para Smart TV.
- **Inserir a logo** "Novo Boi João Dias" como identidade.
- **Paleta inspirada na logo**: vermelho (#C8102E aprox.), branco, fundo claro neutro.
- **Responsivo de verdade**: usar `clamp()` e `vmin` para escalar bem em TV (1920×1080), notebook e celular sem virar tela enorme.

### Mudanças

**1. Adicionar a logo ao projeto**
- Copiar `user-uploads://ChatGPT_Image_30_de_mar._de_2026_16_25_27.png` para `src/assets/logo-novo-boi.png`.
- Importar como ES module em `Welcome.tsx`.

**2. Redesign `src/pages/Welcome.tsx`**
- Remover: aurora layers, grid overlay, relógio/data no topo, badge "Sistema online", gradientes nos ícones e nos cards.
- Layout novo (centralizado, vertical, enxuto):
  ```text
  ┌─────────────────────────────────┐
  │                                 │
  │        [ LOGO NOVO BOI ]        │
  │                                 │
  │   ┌──────────┐  ┌──────────┐   │
  │   │  ▶ TV    │  │  ⚙ Admin │   │
  │   └──────────┘  └──────────┘   │
  │                                 │
  └─────────────────────────────────┘
  ```
- Cards com:
  - tamanho via `clamp(180px, 22vmin, 320px)` de largura;
  - fundo branco sólido, borda fina cinza, sombra leve;
  - foco: borda vermelha 3px + leve `scale(1.03)` (sem blur, sem glow gigante);
  - ícone simples em vermelho (`#C8102E`), texto preto.
- Logo dimensionada via `clamp(160px, 28vmin, 420px)`.
- Manter a navegação por controle remoto (`useRemoteNavigation`) e clique do mouse.

**3. Atualizar `src/index.css`**
- Remover keyframes não usados: `aurora-shift`, `aurora-shift-2`, `pulse-soft`, `float-up`, classes `.launcher-aurora-1/2`, `.launcher-fade-in`, `.launcher-card.is-selected`.
- Manter apenas `.tv-focusable` (já existe e é usado em outras telas).
- Adicionar token CSS para a marca:
  ```css
  --brand-red: 350 80% 42%;
  --brand-red-dark: 350 80% 32%;
  ```

### Resultado esperado
- Tela inicial limpa, com a logo da marca em destaque.
- Dois botões compactos lado a lado, fáceis de focar no controle.
- Sem efeitos pesados — roda fluido no Fire Stick / TV antiga.
- Escala suave de 1080p até celular sem ficar gigante nem espremido.

### Arquivos
| Arquivo | Mudança |
|---|---|
| `src/assets/logo-novo-boi.png` | Novo (copiado do upload) |
| `src/pages/Welcome.tsx` | Reescrito — layout enxuto + logo |
| `src/index.css` | Remover animações aurora; adicionar tokens da marca |

## Plano: Navegação tipo Fire TV + Análise Multi-Empresa

---

### Parte 1 — Navegação estilo Fire TV (sem cursor "arrastando")

**Problema atual**

- A tela inicial (`/`) e a seleção de playlist (`/tv`) já têm navegação por teclado (← → ↑ ↓ + Enter), mas o controle remoto da TV está agindo como **mouse aéreo** (cursor flutuante). Isso é uma característica de alguns controles (LG Magic Remote, certos controles de Android TV) — quando o cursor aparece, o navegador entra em modo mouse e ignora o foco por teclado.
- Resultado: o usuário precisa "mirar" e arrastar o cursor em vez de saltar opção a opção.

**Solução proposta — três camadas trabalhando juntas**

**A) Esconder o cursor e forçar modo "10-foot UI"**

- CSS global em `index.html`/`src/index.css`:
  - `cursor: none` em todas as rotas TV (`/`, `/tv`, `/slideshow`)
  - `*:focus { outline: none }` + estilos próprios de foco (ring grande, escala, glow)
- Detectar quando o usuário está em modo TV (User-Agent contendo `SmartTV`, `Tizen`, `WebOS`, `BRAVIA`, `AFT` (Fire TV), `GoogleTV`, ou parâmetro `?tv=1`) e aplicar classe `body.tv-mode`.

**B) Capturar TODAS as teclas de controle remoto**

- Hoje só tratamos `ArrowLeft/Right/Up/Down` e `Enter`. Controles de TV enviam códigos extras:
  - **Tecla OK / Select**: `keyCode 13` (Enter), mas Fire TV envia `keyCode 23`; LG envia `keyCode 13`; Samsung Tizen `keyCode 13`
  - **Voltar**: `Escape`, `keyCode 27` ou `keyCode 461` (LG), `keyCode 8` (Fire TV)
  - **Play/Pause**: `MediaPlayPause` (415/19)
  - **Canal +/-**: `keyCode 427/428`
- Criar hook `useRemoteNavigation()` em `src/hooks/use-remote-navigation.ts` que:
  - Normaliza todas essas teclas para 6 ações: `up`, `down`, `left`, `right`, `select`, `back`
  - Aplica em qualquer página TV via `useRemoteNavigation({ onSelect, onBack, ... })`

**C) Sistema de foco visível e instantâneo (estilo Fire TV)**

- Nas opções da Welcome e TVStart:
  - Foco com `ring-8 ring-blue-400 scale-110 shadow-2xl shadow-blue-500/50` — bem visível à distância
  - Transição de **150ms** (rápido, não os 300ms atuais)
  - Auto-focus na primeira opção ao montar a tela
  - Ao pressionar uma direção, **um único clique = uma transição** (já é assim no código, mas o cursor estava interferindo)
- Adicionar feedback sonoro opcional (tick curto ao mover) — desativável.

**D) Tela de boas-vindas reorganizada como "launcher"**

- Layout horizontal estilo Fire TV: cards grandes lado a lado, ícone grande, título grande, foco bem destacado.
- Adicionar cards diretos para:
  - **Iniciar TV agora** (vai direto pro slideshow, sem passar por seleção de playlist se só houver 1)
  - **Escolher playlist**
  - **Painel admin** (escondido atrás de combinação tipo segurar OK por 3s, ou tecla "Menu", para evitar acesso acidental do público)

---

### Parte 2 — Sistema está preparado para múltiplas empresas?

**Resposta curta: NÃO, hoje não está.**

**Análise do estado atual**

Olhei as tabelas e o código:


| Tabela                          | Tem coluna de empresa/tenant? | Observação                |
| ------------------------------- | ----------------------------- | ------------------------- |
| `menu_items` (imagens)          | Não                           | Compartilhada por todos   |
| `audio_tracks`                  | Não                           | Compartilhada             |
| `announcements` (locuções)      | Não                           | Compartilhada             |
| `playlists` / `playlist_tracks` | Não                           | Compartilhadas            |
| `slideshow_settings`            | Não, single-row               | Configuração global única |


Além disso:

- **Não existe autenticação** — qualquer pessoa que abrir a URL acessa tudo.
- **Storage buckets** (`menu-images`, `audio-tracks`, `announcements`) são públicos e sem isolamento por pasta.
- **RLS** está aberto (`true` para todos) — qualquer um lê/escreve qualquer linha.

Hoje o sistema é **single-tenant**: uma instalação = uma empresa. Se você cadastrar duas empresas no mesmo banco, elas verão e editarão o conteúdo uma da outra.

**O que seria preciso para virar multi-empresa (multi-tenant)**

Não vou implementar agora — só apresento o caminho para você decidir se quer atacar nesta etapa ou em outra.

1. **Autenticação** (Lovable Cloud — email/senha + Google)
2. **Tabela `companies**` (id, nome, slug, logo, plano, etc.)
3. **Tabela `profiles**` ligando `auth.users` ↔ `companies` com papel (owner/editor/viewer)
4. **Adicionar `company_id` em todas as tabelas de conteúdo** (`menu_items`, `audio_tracks`, `announcements`, `playlists`, `slideshow_settings`)
5. **Reescrever RLS** — cada usuário só vê linhas onde `company_id` = sua empresa (via função `security definer` `get_user_company()`)
6. **Storage isolado por pasta** — `menu-images/{company_id}/arquivo.jpg` + policy de bucket por prefixo
7. **URL da TV com identificador da empresa**: `/tv/{slug-empresa}` ou pareamento via código de 6 dígitos (TV mostra código → admin emparelha no painel)
8. **Painel admin com seletor de empresa** (se um usuário gerencia várias)

Esforço estimado: trabalho considerável (provavelmente 2–3 ciclos grandes de refatoração + migração de dados existentes). Faz sentido se você pretende vender/operar para vários clientes na mesma instância. Se cada cliente vai ter seu próprio deploy (uma URL Lovable por empresa), **não precisa** mexer em nada — basta duplicar o projeto.

---

### O que vou fazer agora (se aprovado)

Apenas a **Parte 1** (navegação Fire TV). A Parte 2 fica para você decidir em outro momento.


| Arquivo                              | Mudança                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/hooks/use-remote-navigation.ts` | Novo hook que normaliza teclas de controles TV (Fire TV, LG, Samsung, Sony) em 6 ações           |
| `src/index.css`                      | Classe `.tv-mode` com `cursor: none`, foco grande e visível                                      |
| `src/pages/Welcome.tsx`              | Reescrita como launcher Fire TV: foco grande, auto-focus, ações via hook, admin escondido        |
| `src/pages/TVStart.tsx`              | Migrar para o hook + estilos de foco maiores + atalho "iniciar direto"                           |
| `src/pages/Slideshow.tsx`            | Adicionar `cursor: none` + tratar Back do controle                                               |
| `index.html`                         | Detecção de SmartTV via User-Agent → adiciona classe `tv-mode` no `<body>` antes do React montar |


### Resultado esperado

- Sem cursor flutuante na TV — só o card focado fica em destaque
- Um clique do controle = uma opção pulada (sem segurar/arrastar)
- Funciona em Fire TV, LG WebOS, Samsung Tizen, Android TV e Smart TVs Sony
- Tecla "Voltar" do controle volta para tela anterior em vez de sair do app

### Perguntas antes de eu começar

Vou confirmar 2 pontos rapidinho com você na próxima mensagem (qual TV/controle você usa hoje, e se quer esconder o acesso ao admin atrás de combinação especial).

utilizo o fire stick tv em uma tv e a outra tv  uma de 60 polegadas com sistema android
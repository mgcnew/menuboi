
## Plano: Temas Visuais e Widget de Informações

### Visão Geral
Implementar sistema de personalização visual para o slideshow, permitindo escolher entre diferentes temas e exibir informações úteis (data/hora, temperatura, mensagens personalizadas) no canto da tela.

---

## Fase 1: Estrutura de Dados

### 1.1 Nova Tabela no Banco de Dados
Criar tabela `slideshow_settings` para armazenar as configurações:

```text
slideshow_settings
├── id (uuid, primary key)
├── theme ('dark' | 'light' | 'minimal' | 'branded')
├── show_clock (boolean) - mostrar relógio
├── show_date (boolean) - mostrar data
├── show_weather (boolean) - mostrar temperatura
├── weather_location (text) - cidade para clima
├── show_logo (boolean) - mostrar logo da empresa
├── logo_url (text) - URL do logo
├── logo_position ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right')
├── custom_message (text) - mensagem personalizada
├── custom_message_position (text) - posição da mensagem
├── created_at (timestamp)
└── updated_at (timestamp)
```

### 1.2 Tipos TypeScript
Adicionar em `src/types/slideshow.ts`:
- Interface `SlideshowSettings`
- Constantes para opções de tema e posições

---

## Fase 2: Temas Visuais

### 2.1 Opções de Tema
Quatro temas disponíveis:

| Tema | Descrição |
|------|-----------|
| **Escuro** | Fundo preto, transições suaves (padrão atual) |
| **Claro** | Fundo branco, ideal para ambientes claros |
| **Minimal** | Sem sobreposições, apenas imagens em tela cheia |
| **Branded** | Mostra logo da empresa nos cantos |

### 2.2 Implementação CSS
Adicionar variáveis CSS para cada tema em `src/index.css`:
- Cores de fundo e texto
- Estilos de overlay
- Animações específicas

---

## Fase 3: Widget de Informações

### 3.1 Componente `InfoWidget`
Novo componente `src/components/InfoWidget.tsx`:

```text
┌────────────────────────────────────────────────────┐
│                                                    │
│  ┌──────────────┐                 ┌─────────────┐  │
│  │  [Logo]      │                 │   14:35     │  │
│  │              │                 │   Seg, 30   │  │
│  │              │                 │   25°C      │  │
│  └──────────────┘                 └─────────────┘  │
│                                                    │
│              [Imagem do Slideshow]                 │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  "Promoção especial hoje!"                   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 3.2 Funcionalidades do Widget
- **Relógio**: Atualiza a cada segundo
- **Data**: Formato brasileiro (Seg, 30 Jan)
- **Temperatura**: API gratuita (Open-Meteo, sem API key)
- **Logo**: Upload de imagem, posição configurável
- **Mensagem**: Texto livre, posição configurável

---

## Fase 4: Painel de Configurações

### 4.1 Novo Componente `SlideshowSettingsCard`
Adicionar na aba "Configurações" do Dashboard:

```text
┌─────────────────────────────────────────────────────┐
│  Aparência do Slideshow                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tema Visual                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Escuro │ │ Claro  │ │Minimal │ │Branded │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                     │
│  ───────────────────────────────────────────────── │
│                                                     │
│  Widgets de Informação                              │
│  ☑ Mostrar relógio         ☑ Mostrar data          │
│  ☑ Mostrar temperatura     [Cidade: São Paulo]     │
│                                                     │
│  ───────────────────────────────────────────────── │
│                                                     │
│  Logo da Empresa                                    │
│  ☑ Exibir logo  [Upload]   Posição: [Superior Dir] │
│                                                     │
│  ───────────────────────────────────────────────── │
│                                                     │
│  Mensagem Personalizada                             │
│  [________________________________]                 │
│  Posição: [Inferior Esquerda ▼]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Fase 5: Integração com Slideshow

### 5.1 Modificar `Slideshow.tsx`
- Carregar configurações do banco de dados
- Aplicar classe do tema ao container
- Renderizar `InfoWidget` com as configurações

### 5.2 Atualização em Tempo Real
- Usar Supabase Realtime para detectar mudanças nas configurações
- Atualizar slideshow automaticamente quando configurações mudarem no Dashboard

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/types/slideshow.ts` | Adicionar interfaces |
| `src/components/InfoWidget.tsx` | **Novo** - Widget de informações |
| `src/components/SlideshowSettingsCard.tsx` | **Novo** - Painel de configurações |
| `src/pages/Dashboard.tsx` | Adicionar configurações na aba Settings |
| `src/pages/Slideshow.tsx` | Integrar temas e widgets |
| `src/index.css` | Estilos dos temas |
| `src/lib/supabase-helpers.ts` | Helper para a nova tabela |
| `supabase/migrations/` | Criar tabela slideshow_settings |

---

## Detalhes Técnicos

### API de Clima (Open-Meteo)
Gratuita, sem necessidade de API key:
```text
https://api.open-meteo.com/v1/forecast?latitude=-23.55&longitude=-46.63&current_weather=true
```

### Performance
- Relógio: `setInterval` de 1 segundo
- Clima: Atualiza a cada 30 minutos
- Logo: Cachear URL pública do storage

### Responsividade
- Widget adapta tamanho baseado na resolução da TV
- Logo com max-width para não sobrepor conteúdo

---

## Resultado Esperado

- Dashboard com novas opções de personalização
- Slideshow com visual personalizável
- Informações úteis exibidas automaticamente
- Atualizações em tempo real

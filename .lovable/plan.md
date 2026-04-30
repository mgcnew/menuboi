## Plano: 3 ajustes finais — Welcome, TV e PWA

### 1. Welcome: navegação estilo Smart TV (mais fluida)
A lógica de seleção lateral já existe (←/→ alternam entre os 2 cards). Vou melhorar o **feedback visual** pra parecer com Fire TV / Google TV:

- Cards **lado a lado sempre** (mesmo em mobile pequeno) — usar `flex-row` em vez de `flex-wrap`.
- Aumentar levemente o `scale` no foco: `1.05` (era `1.03`).
- Adicionar uma **barra inferior vermelha** que aparece sob o card focado (indicador clássico de TV).
- Suavizar a transição: `transition-all duration-200 ease-out` (mais responsivo ao apertar a seta).
- Remover o hover do mouse na TV (já está via `tvMode`), mas reforçar que clique do mouse no admin/notebook continua funcionando.

### 2. `/tv` inicia direto no slideshow
- **Reescrever `src/pages/TVStart.tsx`** para apenas redirecionar imediatamente:
  ```tsx
  useEffect(() => { navigate("/slideshow", { replace: true }); }, []);
  ```
- Tela mostra "Iniciando..." por uma fração de segundo só.
- Toda configuração (escolher playlist, etc.) passa a ser feita exclusivamente no Painel Admin.
- Carrega "todas as músicas" por padrão. Se o admin quiser fixar uma playlist específica, faremos isso em uma próxima iteração via campo nas Settings (não escopo desta tarefa).

### 3. Remover PWA prompt das TVs (definitivo)
Em `src/components/PWAInstallPrompt.tsx`, trocar:
```ts
if (isSmartTV()) { setIsTV(true); return; }
```
por:
```ts
if (isSmartTV()) { setIsInstalled(true); return; } // hard-stop
```
Isso garante que **nada** renderize em TV — nem o banner, nem qualquer modal de instruções. O early-return `if (isInstalled || !showPrompt) return null;` cobre 100%.

### Arquivos
| Arquivo | Mudança |
|---|---|
| `src/pages/Welcome.tsx` | Polir foco dos cards (scale 1.05 + barra inferior + flex-row fixo) |
| `src/pages/TVStart.tsx` | Reduzir a um redirect imediato para `/slideshow` |
| `src/components/PWAInstallPrompt.tsx` | Hard-stop em TVs (`setIsInstalled(true)`) |

### Resultado
- Tela inicial com cards realmente parecidos com Smart TV moderna — seta vai e o foco escorrega instantâneo de um pro outro.
- Ligar a TV / abrir `/tv` cai direto na propaganda, sem tela intermediária.
- Nenhuma TV vê mais o prompt de "Instalar app".

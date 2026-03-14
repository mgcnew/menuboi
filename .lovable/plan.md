

## Plano: Corrigir erros de build + Compressão de imagens no upload

### 1. Corrigir erros de build (NodeJS.Timeout)

Trocar `NodeJS.Timeout` por `ReturnType<typeof setTimeout>` nos 3 arquivos afetados:
- `src/components/AudioPlayer.tsx` (linha 41)
- `src/pages/Slideshow.tsx` (linhas 62-63)
- `src/hooks/use-throttle.ts` (linha 8)

### 2. Compressão de imagens no upload

**Abordagem**: Usar Canvas API nativa do browser (sem bibliotecas externas) para comprimir imagens antes do upload.

**Arquivo: `src/components/ImageUpload.tsx`**

Adicionar função `compressImage(file)` que:
1. Carrega a imagem num `<canvas>` offscreen
2. Redimensiona para max 1920px (largura ou altura) — ideal para TVs Full HD
3. Exporta como WebP com qualidade 80% (ou JPEG 85% como fallback)
4. Retorna o arquivo comprimido

Lógica:
- Só comprime imagens (não vídeos)
- Se a imagem já for menor que 1920px, mantém o tamanho mas ainda comprime qualidade
- Nome do arquivo mantém o original mas extensão muda para `.webp`

```text
Fluxo:
Arquivo Original (5MB JPG 4000x3000)
  → Canvas resize (1920x1440)
  → Export WebP 80%
  → Arquivo Comprimido (~200-400KB)
  → Upload para storage
```

| Arquivo | Mudança |
|---------|---------|
| `src/components/AudioPlayer.tsx` | Fix NodeJS.Timeout |
| `src/pages/Slideshow.tsx` | Fix NodeJS.Timeout |
| `src/hooks/use-throttle.ts` | Fix NodeJS.Timeout |
| `src/components/ImageUpload.tsx` | Adicionar compressão via Canvas API |


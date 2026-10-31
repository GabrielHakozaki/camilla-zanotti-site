# Site — Camilla Zanotti Gallon

Mockup em avaliação. Site estático de quatro páginas, sem build e sem
dependências.

```
index.html              Home
experiencias.html       Experiências sensoriais
meliponicultura.html    Formação e colônias
contato.html            Contato

css/site.css            tokens, componentes, responsivo, movimento
js/site.js              navegação, reveals, contexto do formulário
assets/                 imagens
```

## Rodar local

Abre por duplo clique no `index.html`, ou servido:

```bash
python -m http.server 8099
```

## Publicação

GitHub Pages, via `.github/workflows/pages.yml` — qualquer push na `main`
publica. O `robots.txt` mantém o site fora de buscadores enquanto está em
avaliação; remover no lançamento.

## Notas

Índice do projeto: `grep -rn "== SB:" .`

O conteúdo é HTML estático — o JavaScript só faz comportamento, então nenhuma
seção desaparece se ele falhar. O CSS é agnóstico de modo de renderização e
respeita `prefers-reduced-motion`.

# Allies — Site de Campanhas de RPG

Site para hospedar campanhas de RPG, fichas de personagem e informações de sessão. Começou como projeto para o Léo e os amigos, com expansão futura planejada.

## Arquivos do código (site principal)
- `index.html` — estrutura da página
- `style.css` — identidade visual (sistema modernista: Archivo, fundo claro, acento vermelho)
- `app.js` — lógica: autenticação, campanhas, participantes, ficha completa de D&D 5e

## Stack (site principal)
- HTML/CSS/JS puro (sem build, sem React/TS)
- [Supabase](https://supabase.com) para autenticação e banco de dados (projeto `rpg-campanhas`, plano gratuito)
- **Hospedado na Vercel: https://allies-nine.vercel.app** — deploy a partir do GitHub (Leovilelladev/Allies), Root Directory `./`, sem framework/build (preset "Other")

## Autenticação
- Login com **usuário + senha** (sem e-mail visível)
- Por baixo dos panos, gera um e-mail interno `usuario@allies.local` para o Supabase Auth
- Confirmação de e-mail desativada no painel do Supabase

## Banco de dados (Supabase)
Tabelas: `profiles`, `campanhas` (com `proxima_sessao`), `campanha_membros`, `fichas`,
e as da Mesa Virtual: `cenas`, `mesa_tokens`, `mesa_chat`, `mesa_iniciativa`, `mesa_sons`.
Todas com RLS. Campanhas, fichas e a lista de membros só são visíveis para o mestre e os jogadores convidados (usa uma função `is_campanha_member` no banco). O mestre entra automaticamente como membro da própria campanha.

## Ficha de personagem (D&D 5e)
Ficha completa própria (não é a oficial da Wizards — mesmas mecânicas, visual do Allies), em tela dedicada com abas: Principal, Perícias & Salvaguardas, Combate & Equipamento, Personalidade & História, Magias. Cálculos automáticos de modificadores e bônus. Dados salvos como JSONB na coluna `dados` da tabela `fichas`. Dono edita, outros veem somente leitura.

Todas as caixas de diálogo nativas do navegador (`prompt`, `confirm`) são modais próprios, porque as nativas não aparecem no navegador embutido do VS Code que o usuário usa pra testar. O helper é `confirmar(titulo, texto, rotuloOk)` e devolve uma Promise.

## Mesa Virtual (VTT) — em construção
Nova área expandindo o Allies: mapa de batalha com tokens, iniciativa, chat com rolagem de dados, fog of war. Referência de UI: interface estilo Foundry VTT (mapa central, toolbar de ferramentas à esquerda, painel com abas à direita, HUD do jogador embaixo).

**Decisões de arquitetura:**
- Frontend: React + Vite + Konva.js (justificado aqui, diferente do site principal, pela complexidade de estado/interação)
- Tempo real: Supabase Realtime (não Socket.io/Node — evita precisar hospedar servidor à parte)
- Persistência: mesmas tabelas Postgres/Supabase do site principal (JSONB pra cenas/tokens)
- Integração: área isolada (`/mesa`), linkada a partir de uma campanha; login e dados de campanha/ficha compartilhados com o site principal
- Deploy: build gerado localmente (Vite), arquivos estáticos resultantes sobem junto com o resto do site na Vercel — sem precisar de Git/CI

**Módulos do escopo (baseado em PRD que o usuário elaborou com o Gemini):**
- [x] Canvas com Pan/Zoom (grid, zoom centrado no cursor, arrastar pra mover) — primeira versão pronta, fonte em `mesa-virtual-src/` no vault
- [x] Schema do banco (cenas/tokens) + sincronização em tempo real — tabelas `cenas` e `mesa_tokens` no Supabase (`rpg-campanhas`), RLS por membro de campanha, Realtime habilitado via `postgres_changes`
- [x] Tokens (mover, escalar, girar, camadas) — arrastar com snap na grade, redimensionar/girar via alça do Konva (gruda de 15°), botões "Pra frente"/"Pra trás"
- [x] Rolagem de dados + chat — tabela `mesa_chat` no Supabase, painel lateral, comando `/r NdM+K`
- [x] Rastreador de iniciativa — tabela `mesa_iniciativa` + campos turno/rodada em `cenas`, painel lateral, "Próximo turno" e "Encerrar" restritos ao mestre
- [x] Fog of war — colunas `fog_ativo`/`fog_revelado` em `cenas`, pintura por célula da grade, mestre vê fraco/"como jogador"
- [x] Soundboard — bucket `mesa-sons` no Storage + tabela `mesa_sons`, hotbar embaixo, toca via broadcast em tempo real
- [x] Permissões refinadas de token — token pode ser vinculado a uma `ficha` (dropdown pro mestre); dono da ficha também pode mover/editar o token

**Todos os módulos do PRD original da Mesa Virtual estão feitos.** Ideias pra evoluir depois: música ambiente em loop persistente (hoje o soundboard é só efeito instantâneo), sincronizar rolagens de dados com a ficha de personagem, e o deploy de verdade na Vercel.

**Integração com o site principal (feito):** a tela da campanha tem um botão "Mesa Virtual" que leva pra `mesa/index.html?campanha=<id>` (build da Vite copiado como subpasta `mesa/` dentro da pasta do site principal), e a Mesa Virtual tem um botão "← Campanha" que volta — o site principal agora lê `?campanha=` na URL no login e abre a campanha certa automaticamente. Quando os dois são servidos pela mesma origem (mesmo domínio/porta), a sessão é compartilhada e a tela de login extra da Mesa Virtual nem aparece.

**Como testar localmente:** abre `index.html` (site principal) pelo Live Preview/Simple Browser do VS Code — não o `mesa-virtual-src` direto — loga, entra numa campanha, clica em "Mesa Virtual". Sempre que mexer no código da Mesa Virtual, precisa rodar `npm run build` dentro de `mesa-virtual-src` de novo e copiar o conteúdo de `dist/` por cima da pasta `mesa/` (index.html + assets) pra refletir no site principal — rodar só `npm run dev` não atualiza essa cópia.

**Deploy:** a Vercel está ligada ao repositório GitHub (Leovilelladev/Allies, branch `main`) — todo `git push` pra `main` republica o site automaticamente em https://allies-nine.vercel.app em menos de um minuto, sem precisar mexer em nada no painel da Vercel.

## Funcionalidades do site principal
- [x] Cadastro/login por usuário e senha
- [x] Criar/editar/excluir campanha (só o mestre)
- [x] Restringir campanha por participação (mestre + convidados)
- [x] Convidar jogador por nome de usuário
- [x] Sair de uma campanha (jogador, não mestre)
- [x] Ficha de personagem completa de D&D 5e, editável, com cálculos automáticos
- [x] Hospedar (Vercel) — https://allies-nine.vercel.app

## Identidade visual (redesign — Claude Design)

O tema grimório (couro/pergaminho, Cinzel/Spectral) foi **substituído** por um sistema
modernista desenhado no Claude Design. O arquivo original do design está no histórico do chat.

### Tokens
- **Fonte única:** Archivo, pesos 400–900. Nada de segunda família.
- **Fundo** `#F3F2F2` · **superfície** `#F8F4F4` · **superfície 2** `#EAE7E7`
- **Tinta** `#201E1D` · secundária `#444141` · terciária `#605D5D` · fraca `#7D7979`
- **Filetes** `#D7D3D3` (fino) e `#BAB6B6` (forte)
- **Acento único** `#EC3013` (hover `#DD2B0F`, fundo suave `#FFF2EF`)

### Regras
- **Raio zero** em tudo. Sem sombra difusa — a estrutura vem de filetes de 1px e 2px.
- **`.cap`** é a única voz miúda: 10.5px / 700 / `letter-spacing: .14em` / maiúsculas.
- **Números** usam `tabular-nums` (atributos, bônus, CA/PV, datas) para alinhar em coluna.
- **Acento com parcimônia:** numeração das linhas, setas, botão primário, estado ativo.
- Cartões que formam grade usam borda completa + `margin` negativa, para o filete
  encostar entre vizinhos e a moldura acompanhar só os itens que existem.

### Telas
- **Dashboard:** tabela numerada — Nº · Campanha · Sistema · Mestre · Próxima sessão · →.
  Grade `44px minmax(220px,1.7fr) 130px 110px 150px 28px`. Abaixo de 1000px vira lista empilhada.
- **Login:** duas colunas — painel de marca no vermelho (wordmark ancorado embaixo à
  esquerda) e formulário à direita.
- **Mesa Virtual:** mesma fonte e mesmo acento, **fundo escuro** — mapa de batalha pede
  contraste, igual Foundry/Roll20. Tokens do mapa mantêm a paleta própria.

## Banco: próxima sessão
Coluna `proxima_sessao timestamptz` em `campanhas` (nula = "A combinar"), definida pelo
mestre no modal. A contagem de fichas por campanha é consultada de verdade (o RLS já
limita ao que o usuário pode ver). **Sessões já realizadas não existem no banco** — o
design previa "5 sessões", mas não há registro de sessão; ficou de fora.

## Corrigido de quebra
- Três `confirm()` nativos ainda no código (excluir campanha, sair da campanha, excluir
  ficha), apesar de o `#modal-confirmar` já existir no HTML sem estar ligado a nada.
  Agora usam o modal próprio, via `confirmar()` que devolve Promise.

## Notas
- Sincronizado entre PC e notebook via Google Drive (vault Obsidian dentro da pasta Allies > allies)
- Identidade visual: Cinzel (títulos), Spectral (corpo), JetBrains Mono (dados/stats)
- Usuário testa localmente abrindo o index.html no navegador embutido do VS Code

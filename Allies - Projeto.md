# Allies — Site de Campanhas de RPG

Site para hospedar campanhas de RPG, fichas de personagem e informações de sessão. Começou como projeto para o Léo e os amigos, com expansão futura planejada.

## Arquivos do código (site principal)
- `index.html` — estrutura da página
- `style.css` — identidade visual (tema grimório/couro envelhecido, selos de cera)
- `app.js` — lógica: autenticação, campanhas, participantes, ficha completa de D&D 5e

## Stack (site principal)
- HTML/CSS/JS puro (sem build, sem React/TS)
- [Supabase](https://supabase.com) para autenticação e banco de dados (projeto `rpg-campanhas`, plano gratuito)
- Deploy manual pela Vercel (ainda não hospedado)

## Autenticação
- Login com **usuário + senha** (sem e-mail visível)
- Por baixo dos panos, gera um e-mail interno `usuario@allies.local` para o Supabase Auth
- Confirmação de e-mail desativada no painel do Supabase

## Banco de dados (Supabase)
Tabelas: `profiles`, `campanhas`, `campanha_membros`, `fichas`
Todas com RLS. Campanhas, fichas e a lista de membros só são visíveis para o mestre e os jogadores convidados (usa uma função `is_campanha_member` no banco). O mestre entra automaticamente como membro da própria campanha.

## Ficha de personagem (D&D 5e)
Ficha completa própria (não é a oficial da Wizards — mesmas mecânicas, visual do Allies), em tela dedicada com abas: Principal, Perícias & Salvaguardas, Combate & Equipamento, Personalidade & História, Magias. Cálculos automáticos de modificadores e bônus. Dados salvos como JSONB na coluna `dados` da tabela `fichas`. Dono edita, outros veem somente leitura.

Todas as caixas de diálogo nativas do navegador (`prompt`, `confirm`) foram substituídas por modais próprios, porque não funcionam no navegador embutido do VS Code que o usuário usa pra testar.

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
- [x] Tokens (mover, escalar) — arrastar com snap na grade, redimensionar via alça (Transformer do Konva); girar e camadas ainda faltam
- [ ] Rolagem de dados + chat
- [ ] Rastreador de iniciativa
- [ ] Permissões refinadas de token (hoje: mestre gerencia tudo, jogador só edita o que criou)
- [ ] Fog of war
- [ ] Soundboard

**Como abrir a Mesa Virtual pra testar:** a URL precisa do parâmetro `?campanha=<uuid da campanha>` (ex: `http://localhost:5173/?campanha=...`), e o usuário precisa estar logado no Allies no mesmo navegador (a sessão do Supabase é compartilhada por localStorage). Sem isso a tela mostra uma mensagem central em vez do canvas.

## Funcionalidades do site principal
- [x] Cadastro/login por usuário e senha
- [x] Criar/editar/excluir campanha (só o mestre)
- [x] Restringir campanha por participação (mestre + convidados)
- [x] Convidar jogador por nome de usuário
- [x] Sair de uma campanha (jogador, não mestre)
- [x] Ficha de personagem completa de D&D 5e, editável, com cálculos automáticos
- [ ] Hospedar (Vercel)

## Notas
- Sincronizado entre PC e notebook via Google Drive (vault Obsidian dentro da pasta Allies > allies)
- Identidade visual: Cinzel (títulos), Spectral (corpo), JetBrains Mono (dados/stats)
- Usuário testa localmente abrindo o index.html no navegador embutido do VS Code

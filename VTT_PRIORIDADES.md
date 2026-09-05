# Prioridades do VTT

## Etapa local em andamento — revisão Leo

Sem push/deploy sem autorização específica. Escopo: VTT; login e hub compartilhados não foram alterados.

- [x] Correções locais de névoa: junções, ocultação de tokens, observador e exploração ao abrir portas.
- [x] Receptor de áudio permanente na mesa, volume e parada locais, aviso de falhas.
- [x] Chat recente, paginação por data/id, mesclagem sem duplicação e preservação de texto em erro de envio.
- [x] Parar renderização contínua dos dados após repouso e redesenhar no pan/zoom.
- [x] Portas: confirmar gravação, impedir clique duplicado pendente e detectar conflito pelo estado anterior.
- [ ] Validar estas mudanças no navegador e em duas sessões simultâneas.
- [ ] Tratar concorrência de PV, JSON das fichas e exploração compartilhada (ainda não resolvida).
- [ ] Estender confirmação/recuperação de falhas às demais operações da mesa.

Auditoria somente leitura no projeto Supabase configurado: as políticas `mesa_*_all` permitem `ALL` para `anon, authenticated`, com `USING true` e `WITH CHECK true`; grants de escrita também estão presentes. RLS ativado não está isolando campanhas. O login compartilhado aceita identidade de localStorage. A correção definitiva depende de uma migração coordenada de autenticação fora do VTT; não executar o `supabase_schema.sql` legado, que contém DROP TABLE.

## P0 — Segurança e integridade

- [x] Centralizar a regra de controle de tokens no cliente.
- [x] Impedir jogador de mover, transformar, editar ou excluir token alheio.
- [x] Reservar tokens genéricos e criaturas ao mestre.
- [ ] Substituir a identidade do `localStorage` por Supabase Auth.
- [ ] Mapear o schema real antes de escrever migrations.
- [ ] Aplicar RLS por campanha, mestre e dono do personagem.

Qualquer migration, função, política ou tabela nova deste trabalho deve conter `_leo` no nome descritivo do artefato ou migration para identificar a autoria.

## P1 — Confiabilidade

- [x] Tornar os testes existentes executáveis pelo Node ESM.
- [x] Adicionar testes da regra de controle de tokens.
- [ ] Adicionar rollback visual e toast para operações recusadas.
- [ ] Tratar conflitos de PV, inventário, posição e JSONB.
- [ ] Exibir conexão, reconexão e alterações pendentes.

## P2 — Desempenho e arquitetura

- [x] Carregar o VTT/PixiJS sob demanda.
- [ ] Extrair acesso a dados e Realtime de `MesaCanvas.jsx`.
- [ ] Criar índice espacial ou cache para visão dinâmica.
- [ ] Ampliar benchmark para mapas grandes e 100–300 paredes.

## P3 — Experiência de mesa

- [x] Criar d20 3D do Allies com fonte Blender e exportação GLB.
- [x] Integrar animação do d20 às rolagens e carregar o motor 3D sob demanda.
- [x] Criar modelos d4, d6, d8, d10, d12 e d100.
- [ ] Presença e bloqueio temporário durante arrasto.
- [ ] Movimento remoto suave por broadcast.
- [ ] Ativação de áudio, volume local e parar todos os sons.
- [ ] Paginação do chat e rolagens privadas do mestre.

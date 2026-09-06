# Alinho na Groq gratuita

Integração preparada para Vite + Vercel Functions, sem alterações no Supabase.

## Ativar na Vercel

1. Crie uma conta e uma chave em https://console.groq.com/keys. Mantenha a organização no plano **Free**; não habilite o Developer pago para este teste.
2. No projeto Vercel, em Settings → Environment Variables, adicione `GROQ_API_KEY` com a chave e `ALINHO_ENABLED=true`. Aplique aos ambientes desejados. Nunca coloque a chave em variáveis `VITE_*`, código, mensagens ou arquivos versionados.
3. Faça um novo deploy contendo `api/alinho.js` e `server/alinho.js`. O projeto deve usar a raiz deste repositório, preset Vite, build `npm run build` e saída `dist`.
4. Abra Alinho → Tenho uma dúvida e teste uma pergunta curta. Sem chave ou sem ativação, a interface informa indisponibilidade e mantém os tópicos locais.

Para desativar, defina `ALINHO_ENABLED=false` e faça um novo deploy.

## Desenvolvimento local

Copie `.env.example` para `.env.local`, configure a chave e a ativação e execute `npm run dev`. Reinicie o Vite após mudar as variáveis. `npm run preview` serve somente os arquivos estáticos; teste a função com `npm run dev` ou em um deploy Preview da Vercel.

## Comportamento e limites

- Modelo fixo `openai/gpt-oss-20b`, hospedado na Groq, disponível na tabela Free consultada em 05/09/2026. Nenhuma API da OpenAI é chamada.
- Sem troca automática de modelo/provedor, sem tentativas automáticas e sem ferramentas extras. A cobrança é definida pelo plano da organização Groq: o código não consegue confirmar ou impor o plano Free. `ALINHO_ENABLED` é somente uma chave de ativação.
- Até 1.200 caracteres por pergunta; até 500 tokens para identificar os termos de busca em inglês e 1.200 para explicar os trechos (incluindo raciocínio), com prazo total de 20 segundos. Duas chamadas à Groq por pergunta respondida: termos de busca e resposta. Busca vazia usa uma chamada. São enviados a pergunta, instruções fixas e até quatro trechos de 2.200 caracteres do SRD. Sem histórico, rascunho, chave do Supabase ou dados de campanhas.
- Uma chamada simultânea e quatro por minuto **por instância**; um erro 429 pausa essa instância pelo período informado pela Groq (entre 60 segundos e 24 horas). As cotas da organização Groq continuam sendo o limite efetivo compartilhado.
- O controle em memória reinicia com a função e não é global entre instâncias da Vercel. Não há autenticação própria nesta rota; filtro de origem não substitui autenticação. Para divulgação ampla, acrescentar limitação distribuída e identidade verificada, em coordenação com quem cuida das permissões. Esta primeira versão destina-se a um piloto pequeno.
- Respostas são texto simples, nunca HTML executável. Erros do provedor e credenciais não são repassados nem registrados pelo aplicativo.
- Os tópicos locais não consomem a cota. Ao esgotá-la, a interface informa o problema, sem mudar para cobrança.

## Biblioteca de regras

A biblioteca usa o PDF oficial em inglês do SRD 5.2.1: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf. O arquivo `server/biblioteca/srd-5.2.1.json` contém 976 trechos, paginação e SHA256 da fonte. A busca lexical BM25 com bônus de títulos roda no servidor; os termos portugueses são convertidos para inglês pela Groq. Não requer embeddings, banco vetorial ou mudanças no Supabase.

O modelo recebe somente os trechos recuperados e deve citar seus números. O servidor rejeita respostas com referências fora da lista ou sem nenhuma referência quando há trechos. Isso valida a existência da referência, não garante que cada afirmação é fiel: ainda é necessário conferir respostas e extração de tabelas. Busca sem resultados pede esclarecimento, sem gerar regras de memória. O SRD não equivale aos livros comerciais completos; nomes traduzidos podem exigir esclarecimento ou o nome em inglês.

A interface mostra links às páginas **do SRD**, não páginas dos livros comerciais, e a atribuição CC-BY-4.0 em `server/biblioteca/ATRIBUICAO.md`. O PDF foi extraído com pypdf e teve espaços/hifenização normalizados. Para reproduzir: `python tools/importar-srd.py caminho/SRD_CC_v5.2.1.pdf server/biblioteca/srd-5.2.1.json` (requer pypdf). PDF e ferramentas temporárias ficam em `tmp/`, fora do Git. Só o índice de texto é publicado junto à função, não no bundle do navegador.

## Verificação

`npm test` inclui testes com respostas simuladas da Groq: sucesso, ausência de chave, cota, indisponibilidade, entrada inválida e preservação de segredo. Eles não fazem chamadas externas. A validação real depende da chave configurada na conta gratuita e de um deploy.

Documentação: https://console.groq.com/docs/rate-limits · https://console.groq.com/docs/reasoning · https://vercel.com/docs/functions/runtimes/node-js

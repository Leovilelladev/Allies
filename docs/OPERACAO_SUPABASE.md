# Operação do Allies em produção

Este documento reúne o checklist operacional para publicar o Allies com o projeto Supabase `rpg-campanhas`. Nenhuma credencial deve ser versionada neste repositório.

## Estado atual

- PostgreSQL e RLS permanecem no Supabase.
- A autenticação usa Supabase Auth; o perfil da aplicação é vinculado por `usuarios.auth_id`.
- A senha mínima local está configurada para 8 caracteres.
- O Auth exige sessão recente e senha atual para alteração de senha.
- A URL principal está configurada para `https://www.alliesrpg.com.br`, com redirect permitido para esse domínio.
- O cliente limita tentativas de login a 5 por minuto por janela local.
- O chat possui limite de 60 mensagens por minuto por usuário no banco.
- Os buckets possuem limites no Storage:
  - `mesa-imagens`: 5 MiB, somente imagens;
  - `mesa-mapas`: 20 MiB, somente imagens;
  - `mesa-sons`: 25 MiB, somente áudio e privado.
- A proteção contra senhas vazadas é um recurso do Supabase Auth disponível apenas em planos compatíveis; o PostgreSQL sozinho não fornece esse recurso.
- O projeto está no plano Free, que não inclui backups automáticos agendados.

## Variáveis da aplicação

Copie `.env.example` para o ambiente de execução e preencha os valores pelo painel da Vercel ou pelo gerenciador de segredos do ambiente. Não coloque valores reais em `.env.example`.

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
GROQ_API_KEY=<server-only-key-if-used>
ALINHO_ENABLED=false
```

A chave `VITE_SUPABASE_ANON_KEY` é pública por natureza, mas só deve ser usada junto das políticas RLS. Chaves `service_role`, SMTP, Groq e outras credenciais privadas nunca podem ter o prefixo `VITE_` nem ser enviadas ao navegador.

## Checklist do Supabase antes da produção

1. **Authentication > Sign In / Providers**
   - Manter o provedor de e-mail habilitado.
   - Confirmar a senha mínima de 8 caracteres.
   - Manter `Secure password change` e `Require current password when updating` habilitados.
   - Manter confirmação de e-mail desabilitada enquanto o fluxo legado `@allies.local` estiver ativo.
   - Quando o cadastro passar a usar e-mail real, configurar SMTP antes de habilitar confirmação e recuperação de senha.
2. **Authentication > URL Configuration**
   - Configurar a URL real da aplicação como Site URL.
   - Cadastrar somente os redirects necessários para produção e homologação.
   - Não liberar curingas ou URLs locais em produção.
3. **Storage**
   - Confirmar os limites e MIME types dos três buckets descritos acima.
   - Confirmar que escritas são somente para usuários autenticados e respeitam a campanha.
   - Confirmar que `mesa-sons` continua privado.
4. **Database > Replication**
   - Confirmar que as tabelas necessárias para a mesa continuam habilitadas no Realtime.
5. **Database > Advisors**
   - Corrigir novos avisos de segurança antes de publicar.
   - Índices não utilizados devem ser removidos somente após observar o uso em produção; não remover por alerta isolado.

## SMTP e e-mails

O SMTP deve ser configurado no painel do Supabase com um provedor transacional, por exemplo Resend, SendGrid, Postmark ou SES. A configuração deve conter remetente verificado, host, porta, usuário e senha/API key armazenada pelo próprio painel.

Após a configuração, validar em homologação:

- recuperação de senha;
- convite de usuário, se utilizado;
- confirmação de e-mail, quando o fluxo real for ativado;
- alteração de endereço de e-mail;
- limite de frequência e mensagens de erro.

Não ativar confirmação de e-mail no fluxo atual sem antes remover a dependência do endereço interno `@allies.local`.

## Backups e restauração

O backup não deve depender apenas do código da aplicação. No plano Free atual, o painel informa que backups automáticos agendados não estão incluídos. A equipe responsável deve:

1. contratar um plano com backups automáticos ou executar exportações lógicas externas em frequência definida;
2. definir um responsável e uma frequência de verificação;
3. exportar periodicamente um backup lógico das tabelas e registrar a data;
4. armazenar o backup fora do projeto principal, com acesso restrito;
5. testar restauração em um projeto separado antes de qualquer migração;
6. registrar o RPO/RTO definidos pelo negócio.

Antes de aplicar uma nova migration em produção:

- verificar o SQL em um projeto de homologação;
- confirmar que a migration é idempotente ou que sua versão está registrada;
- realizar backup/snapshot conforme o plano contratado;
- aplicar a migration;
- rodar `npm test` e `npm run build`;
- validar login, criação de campanha, upload, chat e Realtime.

## Rate limits

Existem três camadas complementares:

- limite de autenticação do Supabase, configurado no painel/plano;
- limite local de tentativas no formulário de login;
- limite transacional do chat no banco.

O limite local não substitui proteção no servidor. Em produção, confirmar no painel os limites de sign-in/sign-up, refresh de sessão, OTP e e-mail. Se o tráfego crescer, habilitar CAPTCHA e revisar os limites do plano.

## Critério de aceite operacional

A publicação é considerada pronta quando:

- o build passa sem erros;
- os testes automatizados passam;
- nenhuma credencial aparece no repositório ou no bundle;
- as políticas RLS e Storage são validadas com usuário anônimo, jogador e mestre;
- um fluxo de recuperação de senha é testado após SMTP;
- existe backup recente e restauração testada em ambiente separado;
- há uma pessoa responsável por acompanhar os Advisors e os erros do projeto.

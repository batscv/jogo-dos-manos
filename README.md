# Futsal dos Irmãos

Aplicação de gestão de jogos, pagamentos, equipas e estatísticas com Next.js e Supabase.

## Executar localmente

1. Use Node.js 22 ou superior e execute `npm ci`.
2. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública do Supabase. A chave `service_role` não é necessária.
3. Configure `NEXT_PUBLIC_APP_URL` com o endereço real do ambiente.
4. Execute `npm run dev`.

## Banco de dados

Para um novo projeto, aplique os ficheiros de `supabase/migrations` por ordem. Não execute `supabase/schema.sql` depois das migrações: é um snapshot antigo.

A migração `repair_registration_and_permissions` corrige a atribuição de vagas, protege campos administrativos, limita alterações de avatares ao dono e mantém as funções privilegiadas no schema privado.

Novos utilizadores começam sem privilégios administrativos e sem pagamento confirmado. Promova o administrador inicial no SQL Editor, depois de confirmar a identidade da conta. Nunca aceite `is_admin` ou `is_paid` vindos dos metadados enviados pelo cliente.

Os testes de `tests/database.sql` criam dados temporários dentro de uma transação e terminam com `ROLLBACK`. Execute no SQL Editor após as migrações.

## Cloudflare Pages

O projeto mantém o runtime Edge usado pelo site existente.

- Build: `npm run pages:build`
- Diretório de saída: `.vercel/output/static`
- Node.js: 22 ou superior
- Compatibility flag: `nodejs_compat`
- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_APP_URL` nas variáveis de produção e preview. Nunca publique chaves secretas.
- No Supabase Auth, use `https://jogo-dos-manos.pages.dev` como Site URL e permita `https://jogo-dos-manos.pages.dev/auth/callback` nas Redirect URLs. Inclua também os endereços de desenvolvimento/preview que utilizar.

As versões de `next-on-pages`, Vercel CLI e Wrangler estão fixas para manter o build do Pages reproduzível. `.npmrc` permite a versão corrigida do Next.js, mais recente do que o limite de peer dependency do adaptador antigo. O workflow do GitHub verifica o build completo do adaptador em Linux; a ferramenta antiga não funciona de forma fiável em Windows.

## Verificação

- `npm run typecheck`: TypeScript.
- `npm run build`: compilação Next.js.
- `npm run pages:build`: pacote Cloudflare Pages (Linux).
- `tests/database.sql`: registo, permissões, pagamentos, lotação, lista de espera, desistência, estatísticas, equipas e caixa.

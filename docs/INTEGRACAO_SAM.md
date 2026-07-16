# Integração BNCC → SAM

O Portal BNCC pode transformar exercícios ou atividades avaliativas já geradas em questões estruturadas e enviá-las ao Banco de Questões do SAM. Toda questão entra no SAM como **rascunho**; publicação continua sendo uma decisão do professor.

## Configuração

1. Aplique no banco do SAM a migration `supabase/migrations/20260716_bncc_question_integration.sql` do repositório SAM.
2. Gere um segredo aleatório com pelo menos 32 caracteres.
3. Configure no backend da BNCC:
   - `SAM_BASE_URL`: endereço público do SAM, sem barra final.
   - `SAM_INTEGRATION_SECRET`: segredo compartilhado.
4. Configure no backend do SAM:
   - `BNCC_INTEGRATION_SECRET`: exatamente o mesmo segredo.
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
5. Reinicie/deploy as duas aplicações.

O usuário precisa existir nas duas plataformas com o mesmo e-mail e, no SAM, possuir papel `professor`, `semed` ou `admin`. Professores só podem importar questões dos anos vinculados às suas turmas.

## Fluxo e segurança

- O navegador conversa apenas com o backend da BNCC; o segredo nunca é enviado ao cliente.
- A BNCC consulta os descritores reais do SAM antes de gerar as questões.
- O envio é assinado com HMAC-SHA256 e timestamp, com validade máxima de cinco minutos.
- Cada lote tem um UUID único. Reenvios do mesmo lote são recusados.
- O SAM valida autor, papel, ano lecionado, descritor, alternativas e gabarito.
- Os registros recebem `source = 'bncc'`, lote de importação e auditoria.

## Compatibilidade inicial

A primeira versão cobre Língua Portuguesa e Matemática do 5º e 9º anos, que são os componentes/anos atualmente aceitos pelo modelo de questões do SAM.

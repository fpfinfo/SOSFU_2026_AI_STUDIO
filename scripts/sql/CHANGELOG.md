# SQL Changelog — SISUP/SOSFU

Registro histórico de todas as migrações e fixes aplicados ao banco de dados Supabase.

## Sprint 9 (2026-02-08)

### Normalização de Status (accountabilities)
- **Arquivo:** `sprint9_normalize_accountability_status` (applied via MCP)
- Migrou `CORRECTION` → `WAITING_CORRECTION` nos dados existentes
- Recriou constraint com status alinhados ao frontend: `DRAFT`, `ANALYSIS`, `WAITING_SOSFU`, `APPROVED`, `WAITING_CORRECTION`, `LATE`, `REJECTED`

## Sprint 8 (2026-02-08)

### Colunas de Auditoria
- **Arquivo:** `sprint8_audit_columns.sql`
- `accountability_items`: `audit_reason`, `audit_reason_code`, `audited_by`, `audited_at`
- `accountabilities`: `diligencia_notes`, `diligencia_count`, `parecer_text`, `parecer_generated_at`

## Histórico de Fixes (consolidado — scripts legados já aplicados)

| Script Original | Data Aprox. | Descrição |
|---|---|---|
| `db_complete_fix.sql` | Jan 2026 | Fix geral de RLS e permissões |
| `db_fix_accountabilities_rls.sql` | Jan 2026 | Políticas RLS para accountabilities |
| `db_fix_accountability_submit.sql` | Jan 2026 | Fix de submit de PC |
| `db_fix_crud_final.sql` | Jan 2026 | Fix CRUD final |
| `db_fix_default_role.sql` | Jan 2026 | Fix role padrão |
| `db_fix_delete_items.sql` | Jan 2026 | Fix de exclusão de itens |
| `db_fix_permissions.sql` | Jan 2026 | Fix de permissões gerais |
| `db_fix_status_workflow.sql` | Jan 2026 | Fix de workflow de status |
| `fix_dcomarcas_duplicates.sql` | Jan 2026 | Deduplicação de comarcas |
| `fix_dperfil_permissions.sql` | Jan 2026 | Permissões dperfil |
| `fix_profiles_rls.sql` | Jan 2026 | RLS para profiles |
| `fix_roles_data_and_permissions.sql` | Jan 2026 | Dados e permissões de roles |
| `force_fix_dperfil.sql` | Jan 2026 | Fix emergencial dperfil |

> Esses scripts foram one-off patches já aplicados. Seus efeitos foram consolidados no schema atual.

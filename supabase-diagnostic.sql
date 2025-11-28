-- ============================================
-- DIAGNÓSTICO DE ESTRUTURA E PERMISSÕES
-- ============================================

-- 1. Listar colunas da tabela LICENSES
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'licenses';

-- 2. Listar colunas da tabela PAYMENTS
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments';

-- 3. Testar a função RPC manualmente (Simulação)
-- Substitua 'SEU_USER_ID_AQUI' pelo ID do usuário que você está testando (pegue na tabela auth.users ou profiles)
-- DO $$
-- BEGIN
--   PERFORM public.process_payment_success('TEST-PAYMENT-ID', 'mensal');
-- END $$;

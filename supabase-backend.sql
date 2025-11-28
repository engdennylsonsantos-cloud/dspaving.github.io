-- ============================================
-- BACKEND VIA SQL (Para resolver CORS)
-- ============================================

-- 1. Habilitar extensão HTTP (Permite fazer chamadas de API direto do banco)
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- 2. Função para criar assinatura no Mercado Pago
CREATE OR REPLACE FUNCTION public.create_mp_subscription(
    p_plan_type text,
    p_back_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de admin (para acessar o token)
AS $$
DECLARE
    v_url text := 'https://api.mercadopago.com/preapproval';
    -- TOKEN DO MERCADO PAGO (Idealmente estaria em uma tabela de segredos, mas aqui vai direto)
    v_token text := 'APP_USR-1554103217165352-112019-22c8449dc29156758c5576ab2e7136a8-3005990056';
    v_user_id uuid;
    v_email text;
    v_price numeric;
    v_title text;
    v_frequency integer;
    v_response http_response;
    v_body jsonb;
BEGIN
    -- Pegar dados do usuário atual
    v_user_id := auth.uid();
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

    IF v_email IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;

    -- Configurar plano
    IF p_plan_type = 'mensal' THEN
        v_price := 99.90;
        v_title := 'DSPaving - Assinatura Mensal';
        v_frequency := 1;
    ELSIF p_plan_type = 'anual' THEN
        v_price := 999.90;
        v_title := 'DSPaving - Assinatura Anual';
        v_frequency := 12;
    ELSE
        RETURN json_build_object('error', 'Plano inválido');
    END IF;

    -- Montar JSON do Body
    v_body := jsonb_build_object(
        'reason', v_title,
        'external_reference', v_user_id::text, -- Garantir que é string
        'payer_email', v_email,
        'auto_recurring', jsonb_build_object(
            'frequency', v_frequency,
            'frequency_type', 'months',
            'transaction_amount', v_price,
            'currency_id', 'BRL'
        ),
        -- URL de produção no Netlify
        'back_url', 'https://dspaving.netlify.app/subscription'
        -- Removido 'status': 'authorized' (CAUSA ERRO 400)
    );
    -- NOTA: Para assinaturas, o MP nem sempre manda payment_id na URL de volta.
    -- Ele manda preapproval_id se configurado corretamente.
    -- Vamos tentar forçar o auto_return se possível, mas na API de Preapproval isso é limitado.

    -- Fazer Request HTTP POST para o Mercado Pago
    SELECT * INTO v_response FROM http((
        'POST',
        v_url,
        ARRAY[
            http_header('Authorization', 'Bearer ' || v_token), 
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        v_body::text
    )::http_request);

    -- Converter resposta para JSON
    -- Se o status for 201 (Created), retorna o conteúdo
    IF v_response.status BETWEEN 200 AND 299 THEN
        RETURN v_response.content::json;
    ELSE
        -- Retornar erro com detalhes brutos para debug
        -- Tentar extrair a causa específica se existir
        RETURN json_build_object(
            'error', 'Erro MP', 
            'status', v_response.status,
            'message', (v_response.content::json->>'message'),
            'cause', (v_response.content::json->'cause'), -- Aqui fica o detalhe do erro de validação
            'details', v_response.content::json
        );
    END IF;
END;
$$;

-- ============================================
-- REFINAMENTO V3: Fluxo de Licença e Pagamento
-- ============================================

-- 1. Mover TERMOS para a tabela PROFILES (pois o usuário aceita antes de ter licença)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS termos_aceitos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_aceite_termos TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS conteudo_termos TEXT; -- Novo campo para o texto completo

-- 2. Atualizar Trigger de Cadastro (SEM TRIAL AUTOMÁTICO)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_cpf TEXT;
  v_phone TEXT;
BEGIN
  v_cpf := NULLIF(TRIM(NEW.raw_user_meta_data->>'cpf'), '');
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  -- Inserir no PROFILE com os termos
  BEGIN
    INSERT INTO public.profiles (
      id, nome_usuario, email, cpf, telefone,
      termos_aceitos, data_aceite_termos, conteudo_termos
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
      NEW.email,
      v_cpf,
      v_phone,
      COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN, false),
      COALESCE((NEW.raw_user_meta_data->>'accepted_at')::TIMESTAMP WITH TIME ZONE, NOW()),
      COALESCE(NEW.raw_user_meta_data->>'terms_content', '') -- Salva o texto completo
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil: %. Tentando básico.', SQLERRM;
    INSERT INTO public.profiles (id, nome_usuario, email)
    VALUES (NEW.id, 'Usuário (Erro)', NEW.email);
  END;
  
  -- REMOVIDO: Não cria mais licença automática (Trial)
  -- O usuário ficará sem registro na tabela 'licenses' até pagar.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar Função de Processamento de Pagamento (Cria Licença e Registra Pagamento)
CREATE OR REPLACE FUNCTION public.process_payment_success(
  p_payment_id TEXT,
  p_plan_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_days INT;
  v_user_id UUID;
  v_license_exists BOOLEAN;
BEGIN
  IF p_plan_type = 'mensal' THEN v_days := 30;
  ELSIF p_plan_type = 'anual' THEN v_days := 365;
  ELSE RETURN json_build_object('success', false, 'message', 'Plano inválido'); END IF;

  v_user_id := auth.uid();

  -- Verificar se já existe licença
  SELECT EXISTS(SELECT 1 FROM public.licenses WHERE user_id = v_user_id) INTO v_license_exists;

  IF v_license_exists THEN
    -- ATUALIZAR licença existente
    UPDATE public.licenses
    SET 
      status = 'ativo',
      tipo_plano = p_plan_type,
      data_expiracao = CASE 
        WHEN data_expiracao > NOW() THEN data_expiracao + (v_days || ' days')::INTERVAL 
        ELSE NOW() + (v_days || ' days')::INTERVAL 
      END,
      updated_at = NOW()
    WHERE user_id = v_user_id;
  ELSE
    -- CRIAR nova licença (primeiro pagamento)
    INSERT INTO public.licenses (
      user_id, tipo_plano, status, data_expiracao, chave_licenca
    )
    VALUES (
      v_user_id,
      p_plan_type,
      'ativo',
      NOW() + (v_days || ' days')::INTERVAL,
      'LIC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || v_user_id::TEXT) FROM 1 FOR 16))
    );
  END IF;

  -- REGISTRAR PAGAMENTO (Correção: Garantir que insere)
  -- Gera UUID explicitamente se o banco não estiver gerando
  INSERT INTO public.payments (
    id,
    user_id, 
    amount, 
    status, 
    external_reference, 
    plan_type
  )
  VALUES (
    gen_random_uuid(), -- Garante ID único
    v_user_id, 
    CASE WHEN p_plan_type = 'mensal' THEN 99.90 ELSE 999.90 END,
    'approved',
    p_payment_id,
    p_plan_type
  );

  RETURN json_build_object('success', true, 'message', 'Licença ativada com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

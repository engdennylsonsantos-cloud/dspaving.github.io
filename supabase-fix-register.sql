-- ============================================
-- CORREÇÃO DE ERRO NO CADASTRO
-- ============================================

-- O erro "Database error saving new user" geralmente acontece porque:
-- 1. O CPF já existe no banco (violação de unicidade)
-- 2. Ou o CPF está vazio e o banco tenta salvar '' (string vazia) duplicada
-- 3. Ou as colunas não foram criadas corretamente

-- Vamos recriar a função mais robusta:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_cpf TEXT;
  v_phone TEXT;
BEGIN
  -- Tratar CPF: Se vier vazio ou nulo, salvar como NULL (para não violar unique)
  v_cpf := NULLIF(TRIM(NEW.raw_user_meta_data->>'cpf'), '');
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  -- Tentar inserir no profile
  BEGIN
    INSERT INTO public.profiles (id, nome_usuario, email, cpf, telefone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      v_cpf,
      v_phone
    );
  EXCEPTION WHEN unique_violation THEN
    -- Se der erro de CPF duplicado, tentar inserir sem o CPF (ou falhar, dependendo da regra)
    -- Aqui vamos permitir o cadastro mas sem o CPF duplicado para não travar o login
    INSERT INTO public.profiles (id, nome_usuario, email, telefone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      v_phone
    );
  END;
  
  -- Criar licença trial de 7 DIAS
  INSERT INTO public.licenses (
    user_id, 
    tipo_plano, 
    status, 
    data_expiracao, 
    chave_licenca,
    termos_aceitos,
    data_aceite_termos
  )
  VALUES (
    NEW.id,
    'mensal',
    'trial',
    NOW() + INTERVAL '7 days',
    'TRIAL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 16)),
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN, false),
    COALESCE((NEW.raw_user_meta_data->>'accepted_at')::TIMESTAMP WITH TIME ZONE, NOW())
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

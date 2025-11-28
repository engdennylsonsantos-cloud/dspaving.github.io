-- ============================================
-- ATUALIZAÇÃO: Adicionar Aceite de Termos
-- ============================================

-- 1. Adicionar colunas na tabela licenses
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS termos_aceitos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_aceite_termos TIMESTAMP WITH TIME ZONE;

-- 2. Atualizar a função handle_new_user para incluir o aceite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, nome_usuario, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Criar licença trial de 30 dias com aceite de termos
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
    NOW() + INTERVAL '30 days',
    'TRIAL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 16)),
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN, false),
    COALESCE((NEW.raw_user_meta_data->>'accepted_at')::TIMESTAMP WITH TIME ZONE, NOW())
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

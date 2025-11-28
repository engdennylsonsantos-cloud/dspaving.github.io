-- ============================================
-- SCRIPT DE REPARO GERAL (Salva-Vidas)
-- ============================================
-- Execute este script para garantir que o banco tenha TUDO que precisa.

-- 1. GARANTIR QUE AS TABELAS EXISTEM
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome_usuario TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GARANTIR QUE TODAS AS COLUNAS EXISTEM (Evita erro de "column does not exist")
-- Tabela Profiles
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='cpf') THEN
    ALTER TABLE public.profiles ADD COLUMN cpf TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='telefone') THEN
    ALTER TABLE public.profiles ADD COLUMN telefone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='nome_usuario') THEN
    ALTER TABLE public.profiles ADD COLUMN nome_usuario TEXT;
  END IF;
END $$;

-- Tabela Licenses
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='termos_aceitos') THEN
    ALTER TABLE public.licenses ADD COLUMN termos_aceitos BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='data_aceite_termos') THEN
    ALTER TABLE public.licenses ADD COLUMN data_aceite_termos TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='tipo_plano') THEN
    ALTER TABLE public.licenses ADD COLUMN tipo_plano TEXT DEFAULT 'mensal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='status') THEN
    ALTER TABLE public.licenses ADD COLUMN status TEXT DEFAULT 'trial';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='chave_licenca') THEN
    ALTER TABLE public.licenses ADD COLUMN chave_licenca TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='data_expiracao') THEN
    ALTER TABLE public.licenses ADD COLUMN data_expiracao TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 3. RECRIAR A FUNÇÃO DE CADASTRO (Versão à prova de falhas)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_cpf TEXT;
  v_phone TEXT;
BEGIN
  -- Tratar inputs (evitar string vazia em campo unique)
  v_cpf := NULLIF(TRIM(NEW.raw_user_meta_data->>'cpf'), '');
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  -- 1. Tentar inserir no PROFILE
  BEGIN
    INSERT INTO public.profiles (id, nome_usuario, email, cpf, telefone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
      NEW.email,
      v_cpf,
      v_phone
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se der erro (ex: CPF duplicado), tenta inserir só o básico para não travar o cadastro
    RAISE WARNING 'Erro ao criar perfil completo: %. Tentando básico.', SQLERRM;
    INSERT INTO public.profiles (id, nome_usuario, email)
    VALUES (NEW.id, 'Usuário (Erro Profile)', NEW.email);
  END;
  
  -- 2. Tentar inserir na LICENÇA
  BEGIN
    INSERT INTO public.licenses (
      user_id, tipo_plano, status, data_expiracao, chave_licenca, termos_aceitos, data_aceite_termos
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
  EXCEPTION WHEN OTHERS THEN
     RAISE WARNING 'Erro ao criar licença: %', SQLERRM;
     -- Não fazemos nada, o usuário será criado sem licença e poderá contatar suporte
     -- Isso evita que o usuário fique travado na tela de cadastro "Database error"
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GARANTIR QUE A TRIGGER ESTÁ ATIVA
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

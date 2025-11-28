-- ============================================
-- DSPaving - Schema de Licenciamento
-- ============================================

-- ============================================
-- 1. TABELA DE PERFIS DE USUÁRIO
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome_usuario TEXT NOT NULL,
  cpf TEXT UNIQUE,
  email TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. TABELA DE LICENÇAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de plano
  tipo_plano TEXT NOT NULL CHECK (tipo_plano IN ('mensal', 'anual')),
  
  -- Status da licença
  status TEXT NOT NULL CHECK (status IN ('ativo', 'expirado', 'cancelado', 'trial')) DEFAULT 'trial',
  
  -- Chave de licença
  chave_licenca TEXT UNIQUE NOT NULL,
  
  -- Data de expiração
  data_expiracao TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can view own licenses"
  ON public.licenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own licenses"
  ON public.licenses FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. TABELA DE DISPOSITIVOS ATIVADOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.activated_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
  
  -- Identificação do hardware
  hardware_id TEXT NOT NULL,
  
  -- Sessão ativa
  active_session BOOLEAN DEFAULT true,
  
  -- Último login
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Versão do app
  version_app TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(license_id, hardware_id)
);

-- Habilitar RLS
ALTER TABLE public.activated_devices ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can view own devices"
  ON public.activated_devices FOR SELECT
  USING (
    license_id IN (
      SELECT id FROM public.licenses WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. FUNÇÃO: Criar Perfil e Licença Trial
-- ============================================

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
  
  -- Criar licença trial de 30 dias
  INSERT INTO public.licenses (user_id, tipo_plano, status, data_expiracao, chave_licenca)
  VALUES (
    NEW.id,
    'mensal',
    'trial',
    NOW() + INTERVAL '30 days',
    'TRIAL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 16))
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil e licença trial
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. FUNÇÃO: Atualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_licenses
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 6. FUNÇÃO: Validar Licença (para o app desktop)
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_license(
  p_chave_licenca TEXT,
  p_hardware_id TEXT,
  p_version_app TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_license RECORD;
BEGIN
  -- Buscar licença
  SELECT * INTO v_license
  FROM public.licenses
  WHERE chave_licenca = p_chave_licenca;
  
  -- Licença não encontrada
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valido', false,
      'mensagem', 'Chave de licença inválida'
    );
  END IF;
  
  -- Verificar se expirou
  IF v_license.data_expiracao < NOW() THEN
    UPDATE public.licenses
    SET status = 'expirado'
    WHERE id = v_license.id;
    
    RETURN json_build_object(
      'valido', false,
      'mensagem', 'Licença expirada',
      'data_expiracao', v_license.data_expiracao
    );
  END IF;
  
  -- Verificar status
  IF v_license.status NOT IN ('ativo', 'trial') THEN
    RETURN json_build_object(
      'valido', false,
      'mensagem', 'Licença ' || v_license.status
    );
  END IF;
  
  -- Registrar/atualizar dispositivo
  INSERT INTO public.activated_devices (license_id, hardware_id, version_app, last_login, active_session)
  VALUES (v_license.id, p_hardware_id, p_version_app, NOW(), true)
  ON CONFLICT (license_id, hardware_id)
  DO UPDATE SET
    last_login = NOW(),
    active_session = true,
    version_app = COALESCE(p_version_app, activated_devices.version_app);
  
  -- Retornar sucesso
  RETURN json_build_object(
    'valido', true,
    'tipo_plano', v_license.tipo_plano,
    'data_expiracao', v_license.data_expiracao,
    'status', v_license.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON public.licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_chave ON public.licenses(chave_licenca);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);
CREATE INDEX IF NOT EXISTS idx_devices_license_id ON public.activated_devices(license_id);
CREATE INDEX IF NOT EXISTS idx_devices_hardware_id ON public.activated_devices(hardware_id);

-- ============================================
-- CONCLUÍDO!
-- ============================================
-- Execute no Supabase Dashboard:
-- SQL Editor → New Query → Cole este código → Run

-- ============================================
-- ATUALIZAÇÃO V2: Pagamentos, Versões e Correções
-- ============================================

-- 1. CORREÇÃO: Atualizar handle_new_user para ler metadados e Trial de 7 dias
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil com dados dos metadados
  INSERT INTO public.profiles (id, nome_usuario, email, cpf, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Criar licença trial de 7 DIAS (Corrigido)
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
    NOW() + INTERVAL '7 days', -- Trial de 7 dias
    'TRIAL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 16)),
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN, false),
    COALESCE((NEW.raw_user_meta_data->>'accepted_at')::TIMESTAMP WITH TIME ZONE, NOW())
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. NOVA TABELA: Versões do App
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE, -- ex: '1.0.0'
  release_notes TEXT,
  download_url TEXT NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_latest BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para app_versions (Leitura pública)
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.app_versions FOR SELECT USING (true);

-- Inserir dados de exemplo (Versões)
INSERT INTO public.app_versions (version, release_notes, download_url, is_latest)
VALUES 
('1.0.0', 'Lançamento inicial do DSPaving Desktop.', 'https://dspaving.com/downloads/dspaving-setup-1.0.0.exe', false),
('1.1.0', 'Melhorias de performance e correção de bugs.', 'https://dspaving.com/downloads/dspaving-setup-1.1.0.exe', true)
ON CONFLICT (version) DO NOTHING;

-- 3. NOVA TABELA: Pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
  external_reference TEXT, -- ID do Mercado Pago
  plan_type TEXT NOT NULL, -- 'mensal', 'anual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. FUNÇÃO: Processar Pagamento (Simulação/Confirmação)
CREATE OR REPLACE FUNCTION public.process_payment_success(
  p_payment_id TEXT,
  p_plan_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_days INT;
  v_user_id UUID;
BEGIN
  -- Definir dias baseado no plano
  IF p_plan_type = 'mensal' THEN
    v_days := 30;
  ELSIF p_plan_type = 'anual' THEN
    v_days := 365;
  ELSE
    RETURN json_build_object('success', false, 'message', 'Plano inválido');
  END IF;

  v_user_id := auth.uid();

  -- Atualizar Licença
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

  -- Registrar Pagamento (Simplificado para este fluxo)
  INSERT INTO public.payments (user_id, amount, status, external_reference, plan_type)
  VALUES (
    v_user_id, 
    CASE WHEN p_plan_type = 'mensal' THEN 99.90 ELSE 999.90 END,
    'approved',
    p_payment_id,
    p_plan_type
  );

  RETURN json_build_object('success', true, 'message', 'Licença atualizada com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

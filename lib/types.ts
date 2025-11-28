export interface Profile {
    id: string;
    nome_usuario: string;
    cpf: string;
    email: string;
    telefone: string;
    created_at: string;
    updated_at: string;
}

export interface License {
    id: string;
    user_id: string;
    tipo_plano: 'mensal' | 'anual';
    status: 'ativo' | 'expirado' | 'cancelado' | 'trial';
    chave_licenca: string;
    data_expiracao: string;
    termos_aceitos?: boolean;
    data_aceite_termos?: string;
    created_at: string;
    updated_at: string;
}

export interface ActivatedDevice {
    id: string;
    license_id: string;
    hardware_id: string;
    active_session: boolean;
    last_login: string;
    version_app: string;
    created_at: string;
}

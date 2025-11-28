# Mercado Pago Webhook Handler

Esta Edge Function processa notificações do Mercado Pago e ativa licenças automaticamente.

## Variáveis de Ambiente Necessárias

Configure no Supabase Edge Functions:
- `MERCADOPAGO_ACCESS_TOKEN`: Access Token do Mercado Pago
- `SUPABASE_URL`: URL do projeto Supabase (auto-configurado)
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (auto-configurado)

## Deploy

```bash
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
```

## URL Webhook

Após deploy, a URL será:
```
https://[sua-ref].supabase.co/functions/v1/mercadopago-webhook
```

Configure essa URL no painel do Mercado Pago em Webhooks.

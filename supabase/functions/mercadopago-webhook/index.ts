import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MercadoPagoWebhook {
    action: string
    api_version: string
    data: {
        id: string
    }
    date_created: string
    id: number
    live_mode: boolean
    type: string
    user_id: string
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('Webhook received:', req.method)

        // Parse webhook payload
        const payload: MercadoPagoWebhook = await req.json()
        console.log('Payload:', JSON.stringify(payload, null, 2))

        // Validar tipo de notificação
        if (payload.type !== 'payment' && payload.type !== 'subscription_preapproval') {
            console.log('Ignoring notification type:', payload.type)
            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Obter ID do pagamento/assinatura
        const referenceId = payload.data.id

        // Buscar detalhes do pagamento no Mercado Pago
        const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
        if (!accessToken) {
            throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured')
        }

        let paymentData: any
        let planType = 'mensal' // Default

        if (payload.type === 'payment') {
            // Buscar dados do pagamento
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${referenceId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            paymentData = await response.json()
            console.log('Payment data:', paymentData)

            // Extrair external_reference para pegar user_id
            const userId = paymentData.external_reference
            planType = paymentData.description?.includes('Anual') ? 'anual' : 'mensal'

        } else if (payload.type === 'subscription_preapproval') {
            // Buscar dados da assinatura
            const response = await fetch(`https://api.mercadopago.com/preapproval/${referenceId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            paymentData = await response.json()
            console.log('Subscription data:', paymentData)

            const userId = paymentData.external_reference
            planType = paymentData.auto_recurring?.frequency === 12 ? 'anual' : 'mensal'
        }

        // Verificar se pagamento foi aprovado
        if (paymentData.status !== 'approved' && paymentData.status !== 'authorized') {
            console.log('Payment not approved yet:', paymentData.status)
            return new Response(JSON.stringify({ received: true, note: 'Payment not approved' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Conectar ao Supabase como Service Role (admin)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Extrair user_id do external_reference
        const userId = paymentData.external_reference

        // Chamar função RPC para processar pagamento
        const { data, error } = await supabase.rpc('process_payment_success', {
            p_payment_id: referenceId,
            p_plan_type: planType
        })

        if (error) {
            console.error('Error processing payment in DB:', error)
            throw error
        }

        console.log('Payment processed successfully:', data)

        return new Response(
            JSON.stringify({ success: true, message: 'Payment processed' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            },
        )
    }
})

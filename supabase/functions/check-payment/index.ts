import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id } = await req.json()
        console.log('Verificando pagamento para:', user_id)

        if (!user_id) throw new Error('User ID is required')

        const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured')

        // 1. Verificar Assinaturas (Preapproval)
        console.log('Buscando assinaturas...')
        const subResponse = await fetch(
            `https://api.mercadopago.com/preapproval/search?external_reference=${user_id}&status=authorized`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        const subData = await subResponse.json()

        let validPayment = null
        let planType = 'mensal'

        if (subData.results && subData.results.length > 0) {
            // Pegar a mais recente
            const latestSub = subData.results[0]
            console.log('Assinatura encontrada:', latestSub.id)
            validPayment = {
                id: latestSub.id,
                type: 'subscription'
            }
            // Tentar inferir plano pelo valor ou frequência
            if (latestSub.auto_recurring?.frequency === 12 || latestSub.auto_recurring?.transaction_amount > 200) {
                planType = 'anual'
            }
        } else {
            // 2. Se não achar assinatura, verificar Pagamentos Avulsos
            console.log('Buscando pagamentos...')
            const payResponse = await fetch(
                `https://api.mercadopago.com/v1/payments/search?external_reference=${user_id}&status=approved`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            )
            const payData = await payResponse.json()

            if (payData.results && payData.results.length > 0) {
                const latestPay = payData.results[0]
                console.log('Pagamento encontrado:', latestPay.id)
                validPayment = {
                    id: latestPay.id.toString(),
                    type: 'payment'
                }
                if (latestPay.transaction_amount > 200) {
                    planType = 'anual'
                }
            }
        }

        if (!validPayment) {
            console.log('Nenhum pagamento encontrado para:', user_id)
            return new Response(
                JSON.stringify({ success: false, message: 'Nenhum pagamento confirmado encontrado no Mercado Pago.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // 3. Se achou pagamento real, ativar licença no Supabase
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase.rpc('process_payment_success', {
            p_payment_id: validPayment.id,
            p_plan_type: planType
        })

        if (error) throw error

        return new Response(
            JSON.stringify({ success: true, message: 'Licença ativada com sucesso!', data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Erro:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

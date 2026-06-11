// Bootcamp 2.0 — Cyberschool Webhook
// Recoit les notifications de paiement Cyberschool et enregistre dans Supabase

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Normalise un numero de telephone gabonais
// Accepte : +241XXXXXXXX, 00241XXXXXXXX, 241XXXXXXXX, 0XXXXXXXX, XXXXXXXX
// Retourne : 0XXXXXXXX (9 chiffres avec 0 en prefix)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null

  // Supprimer espaces, tirets, parentheses
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')

  // Retirer le prefixe pays
  if (cleaned.startsWith('+241')) cleaned = cleaned.slice(4)
  else if (cleaned.startsWith('00241')) cleaned = cleaned.slice(5)
  else if (cleaned.startsWith('241')) cleaned = cleaned.slice(3)

  // Ajouter le 0 si manquant
  if (cleaned.length === 8 && !cleaned.startsWith('0')) cleaned = '0' + cleaned

  // Verifier le format : 0 + 8 chiffres
  if (/^0\d{8}$/.test(cleaned)) return cleaned

  // Ne correspond pas au format attendu, retourner tel quel
  return cleaned || null
}

// Extraire les donnees du payload Cyberschool
// Supporte plusieurs formats de noms de champs
function extractPayload(body: Record<string, unknown>): {
  reference: string | null
  telephone: string | null
  montant: number | null
  statusCode: string | null
  source: string | null
  currency: string
} {
  const get = (keys: string[]): unknown | null => {
    for (const key of keys) {
      if (body[key] !== undefined && body[key] !== null) return body[key]
    }
    return null
  }

  return {
    reference: String(get(['reference_transaction', 'transaction_id', 'external_transaction_id', 'ref']) || ''),
    telephone: String(get(['telephone', 'phone_number', 'phone', 'msisdn']) || ''),
    montant: Number(get(['montant', 'amount', 'amount_paid']) || 0),
    statusCode: String(get(['code_paiement', 'status_code', 'status', 'code']) || ''),
    source: String(get(['source', 'operator', 'provider', 'channel']) || ''),
    currency: String(get(['devise', 'currency']) || 'XAF'),
  }
}

// Codes de succes Cyberschool
const SUCCESS_CODES = ['0', '00', 'SUCCESS', 'success']

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const rawBody = await req.text()
    const headers = Object.fromEntries(req.headers.entries())
    let payload: Record<string, unknown>

    try {
      payload = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const extracted = extractPayload(payload)
    const telephoneNormalized = normalizePhone(extracted.telephone)
    const isSuccess = SUCCESS_CODES.includes(extracted.statusCode || '')

    // 1. Logger le webhook
    const { data: logEntry, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        source: extracted.source,
        statut: 'traite',
        payload: payload,
        headers: headers,
        reference_transaction: extracted.reference,
        code_paiement: extracted.statusCode,
        montant: extracted.montant,
        telephone_normalized: telephoneNormalized,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging webhook:', logError)
    }

    // 2. Chercher l'inscription correspondante
    let inscription = null
    if (telephoneNormalized) {
      const { data: found } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('telephone_normalized', telephoneNormalized)
        .maybeSingle()
      inscription = found

      // Fallback : chercher sans le 0 initial
      if (!inscription && telephoneNormalized.startsWith('0')) {
        const withoutZero = telephoneNormalized.slice(1)
        const { data: found2 } = await supabase
          .from('inscriptions')
          .select('*')
          .eq('telephone_normalized', withoutZero)
          .maybeSingle()
        inscription = found2
      }
    }

    // 3. Creer l'enregistrement paiement
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        inscription_id: inscription?.id || null,
        telephone_normalized: telephoneNormalized,
        montant: extracted.montant,
        reference_transaction: extracted.reference,
        source: extracted.source,
        statut: isSuccess ? 'succes' : 'echoue',
        payload: payload,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
    }

    // 4. Mettre a jour l'inscription si paiement succes
    if (isSuccess && inscription) {
      const { error: updateError } = await supabase
        .from('inscriptions')
        .update({ statut: 'confirmee' })
        .eq('id', inscription.id)

      if (updateError) {
        console.error('Error updating inscription:', updateError)
      }
    }

    // 5. Mettre a jour le webhook log
    if (logEntry) {
      const logStatut = !inscription ? 'non_trouve' : isSuccess ? 'traite' : 'echoue'
      await supabase
        .from('webhook_logs')
        .update({ statut: logStatut })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify({
      success: true,
      inscription_found: !!inscription,
      payment_status: isSuccess ? 'succes' : 'echoue',
      telephone_normalized: telephoneNormalized,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
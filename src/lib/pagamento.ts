import { supabase } from './supabase'

export async function usarConvite(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('usar_convite', { codigo_convite: codigo })
  if (error) throw error
  return data as string
}

/** Pede ao servidor a página de pagamento do Stripe e vai para ela. */
export async function irParaPagamento(forma: 'cartao' | 'pix') {
  const { data } = await supabase.auth.getSession()
  const r = await fetch('/api/assinar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ forma }),
  })
  const { url } = (await r.json().catch(() => ({}))) as { url?: string }
  if (!r.ok || !url) throw new Error('pagamento')
  window.location.href = url
}

/** Deixa só os dígitos e coloca o 55 do Brasil quando faltar. */
export function normalizarWhatsapp(numero: string): string {
  let d = numero.replace(/\D/g, '')
  if (d.startsWith('0')) d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  return d
}

export function linkWhatsapp(numero: string, mensagem: string): string {
  const d = normalizarWhatsapp(numero)
  const texto = encodeURIComponent(mensagem)
  return d ? `https://wa.me/${d}?text=${texto}` : `https://wa.me/?text=${texto}`
}

export function abrirWhatsapp(numero: string, mensagem: string) {
  window.open(linkWhatsapp(numero, mensagem), '_blank', 'noopener')
}

export function mostrarTelefone(numero: string): string {
  const d = numero.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return numero
}

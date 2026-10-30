// Datas são guardadas como 'AAAA-MM-DD' (sem fuso), igual ao tipo date do banco.

export function hojeISO(agora = new Date()): string {
  return paraISO(agora)
}

export function paraISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return paraISO(new Date(a, m - 1, d + dias))
}

export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1 + meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(d, ultimoDia))
  return paraISO(alvo)
}

export function diaMes(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function dinheiro(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Lê "49,90", "R$ 1.290,00" ou "49.90" e devolve número. */
export function lerDinheiro(texto: string): number {
  let t = texto.replace(/[^\d,.-]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

/** Lê "25/12", "25/12/1960" ou "1960-12-25". Sem ano, guarda 1900 (só importa dia e mês). */
export function lerData(texto: string): string | null {
  const t = texto.trim()
  if (!t) return null
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return validar(+m[1], +m[2], +m[3])
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/)
  if (!m) return null
  let ano = m[3] ? +m[3] : 1900
  if (m[3] && m[3].length === 2) ano += ano > 30 ? 1900 : 2000
  return validar(ano, +m[2], +m[1])
}

function validar(a: number, m: number, d: number): string | null {
  const data = new Date(a, m - 1, d)
  if (data.getMonth() !== m - 1 || data.getDate() !== d) return null
  return paraISO(data)
}

/** Quantos dias faltam até o próximo aniversário (0 = hoje). */
export function diasAteAniversario(aniversario: string, hoje: string): number {
  const [, m, d] = aniversario.split('-').map(Number)
  const [ah, mh, dh] = hoje.split('-').map(Number)
  const base = new Date(ah, mh - 1, dh)
  let proximo = new Date(ah, m - 1, d)
  // 29/02 em ano não bissexto vira 01/03, que é como a maioria comemora.
  if (proximo < base) proximo = new Date(ah + 1, m - 1, d)
  return Math.round((proximo.getTime() - base.getTime()) / 86400000)
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

/** Coloca a barra sozinha enquanto ela digita: "2512" vira "25/12" e "25121960" vira "25/12/1960". */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Formata o telefone enquanto ela digita: "11987654321" vira "(11) 98765-4321". */
export function mascaraTelefone(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Compara nomes sem acento, maiúsculas nem espaços nas pontas. */
export function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/** Iniciais do primeiro e do último nome: "Ana Lúcia Ferreira" vira "AF". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

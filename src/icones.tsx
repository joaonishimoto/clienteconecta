import type { SVGProps } from 'react'

// Ícones de traço simples (24x24), herdam a cor do texto.
type P = SVGProps<SVGSVGElement>

function Base({ children, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      {children}
    </svg>
  )
}

export const IconeHoje = (p: P) => (
  <Base {...p}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="m9 15 2 2 4-4" /></Base>
)
export const IconeClientes = (p: P) => (
  <Base {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5c1.6.9 2.7 2.8 3 5.5" /></Base>
)
export const IconeVender = (p: P) => (
  <Base {...p}><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Base>
)
export const IconeCatalogo = (p: P) => (
  <Base {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></Base>
)
export const IconeVoltar = (p: P) => <Base {...p}><path d="m15 5-7 7 7 7" /></Base>
export const IconeRecolher = (p: P) => (
  <Base {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M16 9.5 13.5 12l2.5 2.5" /></Base>
)
export const IconeEmail = (p: P) => <Base {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></Base>
export const IconeCadeado = (p: P) => <Base {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></Base>
export const IconePessoa = (p: P) => <Base {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c.8-4 3.8-6.5 7.5-6.5s6.7 2.5 7.5 6.5" /></Base>
export const IconeOlho = (p: P) => <Base {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></Base>
export const IconeOlhoFechado = (p: P) => (
  <Base {...p}><path d="M10 5.7a9 9 0 0 1 2-.2c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.4 3.2M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.9 0 3.5-.6 4.9-1.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></Base>
)
export const IconeSeta = (p: P) => <Base {...p}><path d="m9 5 7 7-7 7" /></Base>
export const IconeMais = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
export const IconeMenos = (p: P) => <Base {...p}><path d="M5 12h14" /></Base>
export const IconeCheck = (p: P) => <Base {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>
export const IconeBusca = (p: P) => <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Base>
export const IconeEditar = (p: P) => <Base {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Base>
export const IconeLixo = (p: P) => <Base {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></Base>
export const IconeCamera = (p: P) => (
  <Base {...p}><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></Base>
)
export const IconeBaixar = (p: P) => <Base {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Base>
export const IconeSubir = (p: P) => <Base {...p}><path d="M12 15.5V4.5M7 9l5-5 5 5M5 20h14" /></Base>
export const IconeSair = (p: P) => <Base {...p}><path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8M10 12h10M16.5 8.5 20 12l-3.5 3.5" /></Base>
export const IconeBolo = (p: P) => (
  <Base {...p}><path d="M4 20V13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M3 20h18M4 15.5c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0" /><path d="M12 11V8M12 4.5v.01" /></Base>
)
export const IconeMoeda = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.4 5.8 4.3 0 1.3-1.3 2.1-3 2.1-1.4 0-2.5-.6-3-1.5M12 6v1.8M12 16.2V18" /></Base>
)
export const IconeRepor = (p: P) => (
  <Base {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" /></Base>
)
export const IconeWhatsapp = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3z" />
  </svg>
)
export const IconeEngrenagem = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Base>
)

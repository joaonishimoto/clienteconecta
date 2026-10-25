import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { IconeSeta, IconeVoltar } from './icones'

type Variante = 'principal' | 'secundario' | 'whatsapp' | 'perigo' | 'leve'

export function Botao({
  variante = 'principal',
  icone,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icone?: ReactNode }) {
  return (
    <button type="button" className={`botao botao-${variante} ${className}`} {...props}>
      {icone}
      <span>{children}</span>
    </button>
  )
}

export function Campo({
  rotulo,
  dica,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; dica?: string }) {
  return (
    <label className="campo">
      <span className="campo-rotulo">{rotulo}</span>
      <input {...props} />
      {dica && <span className="campo-dica">{dica}</span>}
    </label>
  )
}

export function Topo({
  titulo,
  subtitulo,
  voltar,
}: {
  titulo: string
  subtitulo?: ReactNode
  voltar?: () => void
}) {
  return (
    <header className="topo">
      {voltar && (
        <button type="button" className="topo-voltar" onClick={voltar}>
          <IconeVoltar /> Voltar
        </button>
      )}
      <h1>{titulo}</h1>
      {subtitulo && <p className="topo-sub">{subtitulo}</p>}
    </header>
  )
}

/** Grupo de linhas num painel branco, com título opcional. */
export function Secao({ titulo, children }: { titulo?: ReactNode; children: ReactNode }) {
  return (
    <section className="secao">
      {titulo && <h2>{titulo}</h2>}
      <div className="painel">{children}</div>
    </section>
  )
}

/** Uma linha de lista. Com onClick, a linha inteira vira botão e ganha a seta. */
export function Linha({
  inicio,
  titulo,
  detalhe,
  fim,
  onClick,
}: {
  inicio?: ReactNode
  titulo: ReactNode
  detalhe?: ReactNode
  fim?: ReactNode
  onClick?: () => void
}) {
  const miolo = (
    <>
      {inicio && <span className="linha-inicio">{inicio}</span>}
      <span className="linha-texto">
        <span className="linha-titulo">{titulo}</span>
        {detalhe && <span className="linha-detalhe">{detalhe}</span>}
      </span>
      {fim && <span className="linha-fim">{fim}</span>}
      {onClick && <IconeSeta className="linha-seta" />}
    </>
  )
  return onClick ? (
    <button type="button" className="linha linha-clicavel" onClick={onClick}>
      {miolo}
    </button>
  ) : (
    <div className="linha">{miolo}</div>
  )
}

export function Avatar({ nome, foto }: { nome: string; foto?: string | null }) {
  if (foto) return <img className="avatar avatar-foto" src={foto} alt="" />
  const partes = nome.trim().split(/\s+/)
  const iniciais = ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
  return (
    <span className="avatar" aria-hidden>
      {iniciais || '?'}
    </span>
  )
}

export function Vazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <p className="vazio-titulo">{titulo}</p>
      {children && <p>{children}</p>}
      {acao}
    </div>
  )
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok'; children: ReactNode }) {
  return (
    <p className={`aviso aviso-${tipo}`} role="status">
      {children}
    </p>
  )
}

export function Acoes({ children }: { children: ReactNode }) {
  return <div className="acoes">{children}</div>
}

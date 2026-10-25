import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Botao({
  variante = 'principal',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal' | 'secundario' | 'whatsapp' | 'perigo' }) {
  return <button type="button" className={`botao botao-${variante} ${className}`} {...props} />
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

export function Topo({ titulo, voltar, acao }: { titulo: string; voltar?: () => void; acao?: ReactNode }) {
  return (
    <div className="topo">
      {voltar && (
        <button type="button" className="topo-voltar" onClick={voltar} aria-label="Voltar">
          ← Voltar
        </button>
      )}
      <h1>{titulo}</h1>
      {acao}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok'; children: ReactNode }) {
  return (
    <p className={`aviso aviso-${tipo}`} role="status">
      {children}
    </p>
  )
}

export function Cartao({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (onClick)
    return (
      <button type="button" className="cartao cartao-clicavel" onClick={onClick}>
        {children}
      </button>
    )
  return <div className="cartao">{children}</div>
}

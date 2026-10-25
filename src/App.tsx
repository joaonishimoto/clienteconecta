import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { ProvedorDados, useDados } from './lib/dados'
import { Entrar, NovaSenha } from './pages/Entrar'
import { Hoje } from './pages/Hoje'
import { Clientes } from './pages/Clientes'
import { Vender } from './pages/Vender'
import { Catalogo } from './pages/Catalogo'
import { Conta } from './pages/Conta'
import { Aviso } from './componentes'

export type Aba = 'hoje' | 'clientes' | 'vender' | 'catalogo'

const ABAS: { id: Aba; icone: string; nome: string }[] = [
  { id: 'hoje', icone: '🔔', nome: 'Hoje' },
  { id: 'clientes', icone: '👥', nome: 'Clientes' },
  { id: 'vender', icone: '🛒', nome: 'Vender' },
  { id: 'catalogo', icone: '📦', nome: 'Catálogo' },
]

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [trocandoSenha, setTrocandoSenha] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setTrocandoSenha(true)
      setSessao(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <p className="carregando">Carregando…</p>
  if (trocandoSenha) return <NovaSenha pronto={() => setTrocandoSenha(false)} />
  if (!sessao) return <Entrar />

  return (
    <ProvedorDados userId={sessao.user.id}>
      <Principal userId={sessao.user.id} />
    </ProvedorDados>
  )
}

function Principal({ userId }: { userId: string }) {
  const { perfil, carregando, erro } = useDados()
  const [aba, setAba] = useState<Aba>('hoje')
  const [contaAberta, setContaAberta] = useState(false)
  // Permite abrir "Vender" já com a cliente escolhida (a partir da ficha da cliente).
  const [vendaPara, setVendaPara] = useState<string | null>(null)
  // Muda a cada toque numa aba, para cada tela voltar ao começo.
  const [toque, setToque] = useState(0)

  const irPara = (a: Aba) => {
    setAba(a)
    setContaAberta(false)
    setToque((t) => t + 1)
    setVendaPara(null)
    window.scrollTo(0, 0)
  }

  const venderPara = (clienteId: string) => {
    irPara('vender')
    setVendaPara(clienteId)
  }

  return (
    <div className="app">
      <header className="cabecalho">
        <div>
          <strong>{perfil?.empresa || 'ClienteConecta'}</strong>
          {perfil?.nome && <span>{perfil.nome}</span>}
        </div>
        <button type="button" className="botao-conta" onClick={() => setContaAberta(true)}>
          ⚙️ Minha conta
        </button>
      </header>

      <main className="conteudo">
        {erro && <Aviso>{erro}</Aviso>}
        {carregando ? (
          <p className="carregando">Carregando…</p>
        ) : contaAberta ? (
          <Conta userId={userId} fechar={() => setContaAberta(false)} />
        ) : aba === 'hoje' ? (
          <Hoje key={toque} />
        ) : aba === 'clientes' ? (
          <Clientes key={toque} vender={venderPara} />
        ) : aba === 'vender' ? (
          <Vender key={toque} clienteInicial={vendaPara} irPara={irPara} />
        ) : (
          <Catalogo key={toque} userId={userId} />
        )}
      </main>

      <nav className="abas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={!contaAberta && aba === a.id ? 'ativa' : ''}
            aria-current={!contaAberta && aba === a.id ? 'page' : undefined}
            onClick={() => irPara(a.id)}
          >
            <span className="aba-icone" aria-hidden>
              {a.icone}
            </span>
            {a.nome}
          </button>
        ))}
      </nav>
    </div>
  )
}

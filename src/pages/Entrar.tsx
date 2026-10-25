import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Aviso, Botao, Campo } from '../componentes'

type Modo = 'entrar' | 'cadastrar' | 'esqueci'

// O botão do Google só aparece depois que o provedor for ativado no Supabase.
const GOOGLE_ATIVO = import.meta.env.VITE_LOGIN_GOOGLE === 'true'

export function Entrar() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk('')
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) setErro('E-mail ou senha não conferem. Tente de novo.')
      } else if (modo === 'cadastrar') {
        if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 letras ou números.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome }, emailRedirectTo: window.location.origin },
        })
        if (error) setErro('Não foi possível criar a conta. Confira o e-mail, ele pode já estar cadastrado.')
        else if (!data.session) setOk('Pronto! Enviamos um e-mail para você confirmar o cadastro.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) setErro('Não foi possível enviar o e-mail. Tente de novo.')
        else setOk('Enviamos um e-mail com o link para criar uma nova senha.')
      }
    } finally {
      setEnviando(false)
    }
  }

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  const trocar = (m: Modo) => {
    setModo(m)
    setErro('')
    setOk('')
  }

  return (
    <main className="entrar">
      <div className="marca">
        <img src="/icone.svg" alt="" width={64} height={64} />
        <p className="marca-nome">ClienteConecta</p>
        <h1>{modo === 'entrar' ? 'Entrar na sua conta' : modo === 'cadastrar' ? 'Criar sua conta' : 'Criar nova senha'}</h1>
        <p className="topo-sub">
          {modo === 'esqueci'
            ? 'Mandamos um link para o seu e-mail.'
            : 'Suas clientes, vendas e lembretes num lugar só.'}
        </p>
      </div>

      {GOOGLE_ATIVO && modo !== 'esqueci' && (
        <>
          <Botao variante="secundario" icone={<img src="/google.svg" alt="" width={22} height={22} />} onClick={google}>
            Entrar com Google
          </Botao>
          <p className="ou">ou</p>
        </>
      )}

      <form onSubmit={enviar} className="formulario">
        {modo === 'cadastrar' && (
          <Campo rotulo="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
        )}
        <Campo
          rotulo="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {modo !== 'esqueci' && (
          <Campo
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            required
          />
        )}
        {erro && <Aviso>{erro}</Aviso>}
        {ok && <Aviso tipo="ok">{ok}</Aviso>}
        <Botao type="submit" disabled={enviando}>
          {modo === 'entrar' ? 'Entrar' : modo === 'cadastrar' ? 'Criar minha conta' : 'Enviar link'}
        </Botao>
      </form>

      <div className="links">
        {modo === 'entrar' ? (
          <>
            <button type="button" onClick={() => trocar('cadastrar')}>Ainda não tenho conta</button>
            <button type="button" onClick={() => trocar('esqueci')}>Esqueci minha senha</button>
          </>
        ) : (
          <button type="button" onClick={() => trocar('entrar')}>Já tenho conta, quero entrar</button>
        )}
      </div>
    </main>
  )
}

export function NovaSenha({ pronto }: { pronto: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 letras ou números.')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) setErro('Não foi possível trocar a senha. Peça um novo link.')
    else pronto()
  }

  return (
    <main className="entrar">
      <div className="marca">
        <img src="/icone.svg" alt="" width={64} height={64} />
        <h1>Criar nova senha</h1>
        <p className="topo-sub">Escolha uma senha com pelo menos 6 letras ou números.</p>
      </div>
      <form onSubmit={salvar} className="formulario">
        <Campo rotulo="Nova senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" required />
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit">Salvar senha</Botao>
      </form>
    </main>
  )
}

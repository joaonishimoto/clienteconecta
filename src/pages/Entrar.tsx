import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensagemDeErro } from '../lib/erros'
import { Aviso, Botao, Campo } from '../componentes'
import { IconeCheck, IconeVoltar } from '../icones'

type Modo = 'entrar' | 'cadastrar' | 'esqueci' | 'confira-email' | 'link-enviado'

// O botão do Google só aparece depois que o provedor for ativado no Supabase.
const GOOGLE_ATIVO = import.meta.env.VITE_LOGIN_GOOGLE === 'true'
const CHAVE_EMAIL = 'clienteconecta:ultimo-email'
const SENHA_MINIMA = 6

function lerEmailSalvo(): string {
  try {
    return localStorage.getItem(CHAVE_EMAIL) ?? ''
  } catch {
    return ''
  }
}

function salvarEmail(email: string) {
  try {
    localStorage.setItem(CHAVE_EMAIL, email)
  } catch {
    // Navegação privada: só não lembramos o e-mail.
  }
}

export function Entrar() {
  const emailSalvo = useRef(lerEmailSalvo())
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState(emailSalvo.current)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  // Muda a cada erro para a animação do aviso tocar de novo.
  const [tentativa, setTentativa] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  const falhar = (texto: string) => {
    setErro(texto)
    setTentativa((n) => n + 1)
  }

  const trocar = (m: Modo) => {
    setModo(m)
    setErro('')
    setSenha('')
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const emailLimpo = email.trim().toLowerCase()
    if (modo !== 'esqueci' && senha.length < SENHA_MINIMA)
      return falhar(`A senha precisa ter pelo menos ${SENHA_MINIMA} letras ou números.`)
    setEnviando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha })
        if (error) return falhar(mensagemDeErro(error))
        salvarEmail(emailLimpo)
      } else if (modo === 'cadastrar') {
        const { data, error } = await supabase.auth.signUp({
          email: emailLimpo,
          password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
        })
        if (error) return falhar(mensagemDeErro(error))
        // Com confirmação de e-mail ligada, um e-mail já cadastrado volta sem erro e sem identidades.
        if (data.user && data.user.identities?.length === 0)
          return falhar(mensagemDeErro({ code: 'user_already_exists' }))
        salvarEmail(emailLimpo)
        if (!data.session) {
          setModo('confira-email')
          setEspera(60)
        }
      } else if (modo === 'esqueci') {
        const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, { redirectTo: window.location.origin })
        if (error) return falhar(mensagemDeErro(error))
        setModo('link-enviado')
        setEspera(60)
      }
    } catch (e) {
      falhar(mensagemDeErro(e as { message?: string }))
    } finally {
      setEnviando(false)
    }
  }

  async function reenviar() {
    setErro('')
    const emailLimpo = email.trim().toLowerCase()
    const { error } =
      modo === 'confira-email'
        ? await supabase.auth.resend({ type: 'signup', email: emailLimpo, options: { emailRedirectTo: window.location.origin } })
        : await supabase.auth.resetPasswordForEmail(emailLimpo, { redirectTo: window.location.origin })
    if (error) return falhar(mensagemDeErro(error))
    setEspera(60)
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) falhar(mensagemDeErro(error))
  }

  const titulo = {
    entrar: emailSalvo.current ? 'Que bom te ver de novo' : 'Entrar na sua conta',
    cadastrar: 'Criar sua conta',
    esqueci: 'Esqueceu a senha?',
    'confira-email': 'Confira seu e-mail',
    'link-enviado': 'Confira seu e-mail',
  }[modo]

  return (
    <div className="entrar">
      <header className="entrar-faixa">
        <p className="entrar-marca">
          <img src="/icone.svg" alt="" width={36} height={36} />
          ClienteConecta
        </p>
        <p className="entrar-promessa">Suas clientes, vendas e lembretes num lugar só.</p>
      </header>

      <main className="entrar-folha">
        {(modo === 'entrar' || modo === 'cadastrar') && (
          <div className="abas-entrar" role="tablist" aria-label="Escolha uma opção">
            <button type="button" role="tab" aria-selected={modo === 'entrar'} onClick={() => trocar('entrar')}>
              Entrar
            </button>
            <button type="button" role="tab" aria-selected={modo === 'cadastrar'} onClick={() => trocar('cadastrar')}>
              Criar conta
            </button>
            <span className={`abas-entrar-marcador ${modo === 'cadastrar' ? 'a-direita' : ''}`} aria-hidden />
          </div>
        )}

        {(modo === 'esqueci' || modo === 'confira-email' || modo === 'link-enviado') && (
          <button type="button" className="topo-voltar" onClick={() => trocar('entrar')}>
            <IconeVoltar /> Voltar para entrar
          </button>
        )}

        <div className="entrar-conteudo" key={modo}>
          <h1>{titulo}</h1>

          {modo === 'confira-email' || modo === 'link-enviado' ? (
            <div className="confira">
              <span className="confira-icone">
                <IconeCheck />
              </span>
              <p>
                {modo === 'confira-email' ? 'Mandamos um link de confirmação para' : 'Mandamos um link para criar uma nova senha para'}{' '}
                <strong>{email.trim()}</strong>.
              </p>
              <p className="topo-sub">Abra o e-mail e toque no link. Se não achar, olhe também na pasta de spam.</p>
              {erro && (
                <Aviso key={tentativa}>
                  {erro}
                </Aviso>
              )}
              <Botao variante="secundario" onClick={reenviar} disabled={espera > 0}>
                {espera > 0 ? `Reenviar e-mail em ${espera}s` : 'Reenviar e-mail'}
              </Botao>
            </div>
          ) : (
            <>
              {modo === 'esqueci' && (
                <p className="topo-sub">Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.</p>
              )}

              {GOOGLE_ATIVO && modo !== 'esqueci' && (
                <>
                  <Botao variante="secundario" icone={<img src="/google.svg" alt="" width={22} height={22} />} onClick={google}>
                    {modo === 'cadastrar' ? 'Criar conta com Google' : 'Entrar com Google'}
                  </Botao>
                  <p className="ou">ou com e-mail</p>
                </>
              )}

              <form onSubmit={enviar} className="formulario" noValidate>
                {modo === 'cadastrar' && (
                  <Campo
                    rotulo="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    required
                  />
                )}
                <Campo
                  rotulo="E-mail"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={modo === 'esqueci' ? 'send' : 'next'}
                  placeholder="seunome@gmail.com"
                  required
                />
                {modo !== 'esqueci' && (
                  <CampoSenha
                    valor={senha}
                    mudar={setSenha}
                    nova={modo === 'cadastrar'}
                  />
                )}

                {erro && (
                  <Aviso key={tentativa}>
                    {erro}
                  </Aviso>
                )}

                <Botao type="submit" disabled={enviando} className={enviando ? 'carregando-botao' : ''}>
                  {enviando
                    ? modo === 'esqueci'
                      ? 'Enviando…'
                      : modo === 'cadastrar'
                        ? 'Criando sua conta…'
                        : 'Entrando…'
                    : modo === 'esqueci'
                      ? 'Mandar link'
                      : modo === 'cadastrar'
                        ? 'Criar minha conta'
                        : 'Entrar'}
                </Botao>
              </form>

              {modo === 'entrar' && (
                <button type="button" className="link-simples" onClick={() => trocar('esqueci')}>
                  Esqueci minha senha
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function CampoSenha({ valor, mudar, nova }: { valor: string; mudar: (s: string) => void; nova: boolean }) {
  const [visivel, setVisivel] = useState(false)
  const [maiusculas, setMaiusculas] = useState(false)
  const conferirCaps = (e: KeyboardEvent<HTMLInputElement>) => setMaiusculas(e.getModifierState?.('CapsLock') ?? false)
  const curtaDemais = valor.length < SENHA_MINIMA

  return (
    <label className="campo">
      <span className="campo-rotulo">{nova ? 'Crie uma senha' : 'Senha'}</span>
      <span className="senha">
        <input
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          onKeyUp={conferirCaps}
          onKeyDown={conferirCaps}
          autoComplete={nova ? 'new-password' : 'current-password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          required
        />
        <button
          type="button"
          className="senha-mostrar"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
        >
          {visivel ? 'Esconder' : 'Mostrar'}
        </button>
      </span>
      {maiusculas && <span className="campo-dica campo-alerta">A tecla de letras maiúsculas está ligada.</span>}
      {nova && (
        <span className={`campo-dica requisito ${curtaDemais ? '' : 'requisito-ok'}`}>
          <IconeCheck /> Pelo menos {SENHA_MINIMA} letras ou números
        </span>
      )}
    </label>
  )
}

export function NovaSenha({ pronto }: { pronto: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [enviando, setEnviando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} letras ou números.`)
      return setTentativa((n) => n + 1)
    }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) {
      setErro('Não foi possível trocar a senha. O link pode ter vencido: peça um novo em "Esqueci minha senha".')
      return setTentativa((n) => n + 1)
    }
    pronto()
  }

  return (
    <div className="entrar">
      <header className="entrar-faixa">
        <p className="entrar-marca">
          <img src="/icone.svg" alt="" width={36} height={36} />
          ClienteConecta
        </p>
      </header>
      <main className="entrar-folha">
        <div className="entrar-conteudo">
          <h1>Criar nova senha</h1>
          <p className="topo-sub">Escolha a senha que você vai usar daqui para a frente.</p>
          <form onSubmit={salvar} className="formulario" noValidate>
            <CampoSenha valor={senha} mudar={setSenha} nova />
            {erro && <Aviso key={tentativa}>{erro}</Aviso>}
            <Botao type="submit" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar nova senha'}
            </Botao>
          </form>
        </div>
      </main>
    </div>
  )
}

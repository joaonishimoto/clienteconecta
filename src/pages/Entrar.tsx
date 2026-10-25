import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { mensagemDeErro } from '../lib/erros'
import { Aviso, Botao, Campo } from '../componentes'
import { IconeCadeado, IconeCheck, IconeEmail, IconePessoa, IconeVoltar } from '../icones'

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

  const subtitulo = {
    entrar: 'Suas clientes, vendas e lembretes num lugar só.',
    cadastrar: 'Leva um minuto. Depois é só cadastrar suas clientes.',
    esqueci: 'Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.',
    'confira-email': '',
    'link-enviado': '',
  }[modo]

  const enviado = modo === 'confira-email' || modo === 'link-enviado'

  return (
    <Moldura selo={enviado ? <IconeCheck /> : undefined}>
      {(modo === 'esqueci' || modo === 'confira-email' || modo === 'link-enviado') && (
        <button type="button" className="topo-voltar entrar-voltar" onClick={() => trocar('entrar')}>
          <IconeVoltar /> Voltar
        </button>
      )}

      <div className="entrar-conteudo" key={modo}>
        <header className="entrar-titulo">
          <h1>{titulo}</h1>
          {subtitulo && <p className="topo-sub">{subtitulo}</p>}
        </header>

        {enviado ? (
          <div className="confira">
            <p>
              {modo === 'confira-email' ? 'Mandamos um link de confirmação para' : 'Mandamos um link para criar uma nova senha para'}{' '}
              <strong>{email.trim()}</strong>.
            </p>
            <p className="topo-sub">Abra o e-mail e toque no link. Se não achar, olhe também na pasta de spam.</p>
            {erro && <Aviso key={tentativa}>{erro}</Aviso>}
            <Botao variante="secundario" onClick={reenviar} disabled={espera > 0}>
              {espera > 0 ? `Reenviar e-mail em ${espera}s` : 'Reenviar e-mail'}
            </Botao>
          </div>
        ) : (
          <>
            <form onSubmit={enviar} className="formulario" noValidate>
              {modo === 'cadastrar' && (
                <Campo
                  rotulo="Seu nome"
                  icone={<IconePessoa />}
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
                icone={<IconeEmail />}
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
              {modo !== 'esqueci' && <CampoSenha valor={senha} mudar={setSenha} nova={modo === 'cadastrar'} />}

              {modo === 'entrar' && (
                <button type="button" className="entrar-esqueci" onClick={() => trocar('esqueci')}>
                  Esqueci minha senha
                </button>
              )}

              {erro && <Aviso key={tentativa}>{erro}</Aviso>}

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

            {/* O botão do Google fica pronto aqui e só aparece quando o provedor for ativado no Supabase. */}
            {GOOGLE_ATIVO && modo !== 'esqueci' && (
              <>
                <p className="ou">ou entre com</p>
                <button type="button" className="entrar-google" onClick={google}>
                  <img src="/google.svg" alt="" width={24} height={24} />
                  {modo === 'cadastrar' ? 'Criar conta com Google' : 'Entrar com Google'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {(modo === 'entrar' || modo === 'cadastrar') && (
        <p className="entrar-trocar">
          {modo === 'entrar' ? 'Primeira vez aqui?' : 'Já tem uma conta?'}
          <button type="button" onClick={() => trocar(modo === 'entrar' ? 'cadastrar' : 'entrar')}>
            {modo === 'entrar' ? 'Criar minha conta' : 'Entrar'}
          </button>
        </p>
      )}
    </Moldura>
  )
}

/** Fundo azul com as linhas de campo da marca e o cartão branco no meio. */
function Moldura({ selo, children }: { selo?: ReactNode; children: ReactNode }) {
  return (
    <div className="entrar">
      <main className="entrar-cartao">
        {/* O selo mostra o ícone do app; depois de mandar o e-mail, vira o sinal de pronto. */}
        <span className={`entrar-selo ${selo ? 'entrar-selo-pronto' : ''}`} key={selo ? 'pronto' : 'app'}>
          {selo ?? <img src="/icone.svg" alt="" width={52} height={52} />}
        </span>
        {children}
      </main>
      <p className="entrar-marca">ClienteConecta</p>
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
      <span className="senha campo-com-icone">
        <IconeCadeado />
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
    <Moldura>
      <div className="entrar-conteudo">
        <header className="entrar-titulo">
          <h1>Criar nova senha</h1>
          <p className="topo-sub">Escolha a senha que você vai usar daqui para a frente.</p>
        </header>
        <form onSubmit={salvar} className="formulario" noValidate>
          <CampoSenha valor={senha} mudar={setSenha} nova />
          {erro && <Aviso key={tentativa}>{erro}</Aviso>}
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </Botao>
        </form>
      </div>
    </Moldura>
  )
}

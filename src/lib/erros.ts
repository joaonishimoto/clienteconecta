type ErroSupabase = { code?: string; message?: string; name?: string; status?: number } | null | undefined

/** Traduz os erros de login do Supabase para frases que dizem o que fazer. */
export function mensagemDeErro(erro: ErroSupabase): string {
  if (!erro) return ''
  const codigo = erro.code ?? ''
  const texto = (erro.message ?? '').toLowerCase()
  if (erro.name === 'AuthRetryableFetchError' || erro.status === 0 || texto.includes('failed to fetch'))
    return 'Sem conexão com a internet. Confira o Wi-Fi ou os dados móveis e tente de novo.'
  if (codigo === 'invalid_credentials' || texto.includes('invalid login credentials'))
    return 'E-mail ou senha não conferem. Confira as letras e tente de novo.'
  if (codigo === 'email_not_confirmed' || texto.includes('email not confirmed'))
    return 'Falta confirmar seu e-mail. Abra a mensagem que enviamos e toque no link.'
  if (codigo === 'user_already_exists' || texto.includes('already registered'))
    return 'Esse e-mail já tem conta. Toque em "Entrar" e use sua senha.'
  if (codigo === 'weak_password' || texto.includes('password should be'))
    return 'Senha muito curta. Use pelo menos 6 letras ou números.'
  if (codigo === 'email_address_invalid' || texto.includes('invalid format') || texto.includes('email address'))
    return 'Esse e-mail parece estar incompleto. Confira se tem @ e o final, como .com.'
  if (codigo.startsWith('over_') || erro.status === 429)
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  return 'Algo deu errado. Tente de novo em instantes.'
}

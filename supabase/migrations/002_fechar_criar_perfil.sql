-- criar_perfil só deve rodar pelo gatilho de cadastro, nunca chamada pela API.
revoke execute on function public.criar_perfil() from public, anon, authenticated;

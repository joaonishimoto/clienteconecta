-- Vários lembretes por produto, cada um com título e descrição.
-- Ex.: um filtro pode ter "Trocar o refil" em 6 meses e "Limpar a vela" em 1 ano.
-- As colunas antigas (produtos.recompra_dias, venda_itens.recompra_em e recompra_avisada) ficam,
-- mas o app não usa mais: tudo o que existia nelas é copiado para as tabelas novas abaixo.

-- O que fica no catálogo: em quantos dias lembrar, com que título e o que dizer à cliente.
create table public.produto_lembretes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  produto_id uuid not null references public.produtos on delete cascade,
  dias integer not null check (dias > 0),
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text not null default '',
  criado_em timestamptz not null default now()
);

-- O que nasce de cada venda: a data em que o lembrete aparece na aba Hoje.
create table public.venda_lembretes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  venda_item_id uuid not null references public.venda_itens on delete cascade,
  titulo text not null,
  descricao text not null default '',
  lembrar_em date not null,
  avisado boolean not null default false
);

create index on public.produto_lembretes (user_id, produto_id);
create index on public.venda_lembretes (user_id, lembrar_em) where not avisado;

alter table public.produto_lembretes enable row level security;
alter table public.venda_lembretes enable row level security;
create policy "dados próprios" on public.produto_lembretes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dados próprios" on public.venda_lembretes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Traz os lembretes que já existiam.
insert into public.produto_lembretes (user_id, produto_id, dias, titulo)
  select user_id, id, recompra_dias, 'Hora de repor' from public.produtos where recompra_dias is not null;

insert into public.venda_lembretes (user_id, venda_item_id, titulo, lembrar_em, avisado)
  select user_id, id, 'Hora de repor', recompra_em, recompra_avisada from public.venda_itens where recompra_em is not null;

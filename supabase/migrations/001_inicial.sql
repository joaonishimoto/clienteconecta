-- ClienteConecta: estrutura inicial.
-- Cada revendedora só enxerga os próprios dados (Row Level Security).

create table public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  empresa text not null default '',
  criado_em timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  whatsapp text not null default '',
  aniversario date,
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0,
  descricao text not null default '',
  foto_url text,
  -- Em quantos dias a cliente costuma precisar comprar de novo (refil, filtro, creme...).
  recompra_dias integer check (recompra_dias is null or recompra_dias > 0),
  criado_em timestamptz not null default now()
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id uuid not null references public.clientes on delete cascade,
  data date not null default current_date,
  total numeric(10,2) not null default 0,
  criado_em timestamptz not null default now()
);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  venda_id uuid not null references public.vendas on delete cascade,
  produto_id uuid references public.produtos on delete set null,
  nome text not null,
  quantidade integer not null default 1 check (quantidade > 0),
  preco numeric(10,2) not null default 0,
  recompra_em date,
  recompra_avisada boolean not null default false
);

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  venda_id uuid not null references public.vendas on delete cascade,
  numero integer not null,
  de integer not null,
  valor numeric(10,2) not null,
  vencimento date not null,
  pago_em date
);

create index on public.clientes (user_id);
create index on public.produtos (user_id);
create index on public.vendas (user_id, cliente_id);
create index on public.venda_itens (user_id, recompra_em);
create index on public.parcelas (user_id, vencimento) where pago_em is null;

-- Segurança: cada usuária só lê e altera as próprias linhas.
alter table public.perfis enable row level security;
create policy "perfil próprio" on public.perfis
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['clientes', 'produtos', 'vendas', 'venda_itens', 'parcelas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dados próprios" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Cria o perfil automaticamente quando alguém se cadastra.
create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'nome', ''));
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Fotos dos produtos: bucket público para leitura, cada usuária grava só na própria pasta.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

create policy "enviar fotos próprias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "apagar fotos próprias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Assinatura (Stripe) e programa "Indique e ganhe".
-- A data pago_ate é quem manda: o teste grátis, cada pagamento e cada mês ganho empurram essa data.
-- Só o servidor (chave service_role) altera assinaturas e indicações; a usuária só lê as dela.

-- Código curto do link de convite, sem letras que se confundem (O/0, I/1).
create function public.novo_codigo() returns text
language plpgsql volatile set search_path = public as $$
declare
  letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.assinaturas where codigo = c);
  end loop;
  return c;
end $$;

create table public.assinaturas (
  user_id uuid primary key references auth.users on delete cascade,
  -- Até quando ela pode usar. Começa com os 14 dias de teste.
  pago_ate timestamptz not null default now() + interval '14 days',
  codigo text not null unique,
  indicada_por uuid references auth.users on delete set null,
  meses_ganhos integer not null default 0,
  stripe_cliente_id text unique,
  stripe_assinatura_id text,
  -- Situação da assinatura no cartão, como o Stripe informa (active, past_due, canceled...).
  assinatura_status text,
  criado_em timestamptz not null default now()
);

alter table public.assinaturas alter column codigo set default public.novo_codigo();

create table public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicadora_id uuid not null references auth.users on delete cascade,
  indicada_id uuid not null unique references auth.users on delete cascade,
  -- pendente: esperando o 1º pagamento e mais 7 dias · valida: conta para o prêmio · anulada: estorno
  status text not null default 'pendente' check (status in ('pendente', 'valida', 'anulada')),
  pago_em timestamptz,
  premiada boolean not null default false,
  criado_em timestamptz not null default now(),
  check (indicadora_id <> indicada_id)
);

create index on public.indicacoes (indicadora_id, status);

-- Avisos do Stripe já tratados: o Stripe pode mandar o mesmo aviso mais de uma vez.
create table public.eventos_stripe (
  id text primary key,
  recebido_em timestamptz not null default now()
);
alter table public.eventos_stripe enable row level security;

alter table public.assinaturas enable row level security;
create policy "ler a própria assinatura" on public.assinaturas
  for select using (user_id = auth.uid());

alter table public.indicacoes enable row level security;
create policy "ler as próprias indicações" on public.indicacoes
  for select using (indicadora_id = auth.uid());

-- Contas que já existem ganham o teste a partir de agora.
insert into public.assinaturas (user_id) select id from auth.users on conflict do nothing;

-- O cadastro passa a criar também a assinatura em teste.
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'nome', ''));
  insert into public.assinaturas (user_id) values (new.id);
  return new;
end $$;

-- Em dia = pago (ou em teste) com 3 dias de tolerância. Sem assinatura, não trava ninguém.
create function public.em_dia() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select pago_ate + interval '3 days' > now() from public.assinaturas where user_id = auth.uid()), true)
$$;

-- Vencida, ela continua vendo tudo, mas não grava nada novo até pagar.
do $$
declare t text;
begin
  foreach t in array array['clientes', 'produtos', 'vendas', 'venda_itens', 'parcelas'] loop
    execute format('drop policy "dados próprios" on public.%I', t);
    execute format('create policy "ler próprios" on public.%I for select using (user_id = auth.uid())', t);
    execute format(
      'create policy "gravar próprios" on public.%I for insert with check (user_id = auth.uid() and public.em_dia())', t);
    execute format(
      'create policy "alterar próprios" on public.%I for update using (user_id = auth.uid() and public.em_dia()) with check (user_id = auth.uid())', t);
    execute format(
      'create policy "apagar próprios" on public.%I for delete using (user_id = auth.uid() and public.em_dia())', t);
  end loop;
end $$;

-- A nova usuária liga a conta ao convite (vindo do link) nos primeiros 7 dias.
create function public.usar_convite(codigo_convite text) returns text
language plpgsql security definer set search_path = public as $$
declare
  eu public.assinaturas;
  quem uuid;
begin
  select * into eu from public.assinaturas where user_id = auth.uid();
  if not found then return 'sem_conta'; end if;
  if eu.indicada_por is not null then return 'ja_tem'; end if;
  if eu.criado_em < now() - interval '7 days' then return 'prazo'; end if;
  select user_id into quem from public.assinaturas where codigo = upper(trim(codigo_convite));
  if quem is null or quem = eu.user_id then return 'invalido'; end if;
  update public.assinaturas set indicada_por = quem where user_id = eu.user_id;
  insert into public.indicacoes (indicadora_id, indicada_id) values (quem, eu.user_id) on conflict do nothing;
  return 'ok';
end $$;

-- Usado pelo servidor: empurra pago_ate em N meses a partir de hoje ou do vencimento, o que for mais tarde.
create function public.estender_assinatura(uid uuid, meses integer) returns void
language sql security definer set search_path = public as $$
  update public.assinaturas
  set pago_ate = greatest(pago_ate, now()) + make_interval(months => meses)
  where user_id = uid
$$;

-- Usado pela rotina diária: valida indicações pagas há 7 dias e devolve quantos meses cada líder ganhou agora.
create function public.validar_indicacoes() returns table (indicadora_id uuid, meses integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  r record;
  k integer;
begin
  update public.indicacoes i set status = 'valida'
  where i.status = 'pendente' and i.pago_em is not null and i.pago_em <= now() - interval '7 days';

  for r in
    select i.indicadora_id as quem, count(*)::int as n
    from public.indicacoes i
    where i.status = 'valida' and not i.premiada
    group by i.indicadora_id
    having count(*) >= 3
  loop
    k := r.n / 3;
    update public.indicacoes set premiada = true
    where id in (
      select id from public.indicacoes
      where indicacoes.indicadora_id = r.quem and status = 'valida' and not premiada
      order by pago_em limit k * 3
    );
    update public.assinaturas set meses_ganhos = meses_ganhos + k where user_id = r.quem;
    indicadora_id := r.quem;
    meses := k;
    return next;
  end loop;
end $$;

revoke execute on function public.novo_codigo() from public, anon, authenticated;
revoke execute on function public.estender_assinatura(uuid, integer) from public, anon, authenticated;
revoke execute on function public.validar_indicacoes() from public, anon, authenticated;
revoke execute on function public.usar_convite(text) from public, anon;
grant execute on function public.usar_convite(text) to authenticated;
grant execute on function public.estender_assinatura(uuid, integer), public.validar_indicacoes() to service_role;

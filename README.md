# ClienteConecta

App simples para revendedoras e franqueadas organizarem clientes, vendas e lembretes. Funciona para qualquer marca: cada pessoa monta o próprio catálogo e coloca o nome da marca que revende.

O app tem quatro abas fixas no rodapé:

- **Hoje:** quem chamar no dia (parcelas para cobrar, aniversários e clientes na hora de repor um produto), cada um com o botão "Chamar no WhatsApp" e a mensagem pronta.
- **Clientes:** cadastro com nome, WhatsApp e aniversário, e a ficha com o histórico de compras e o que falta receber.
- **Vender:** escolhe a cliente, toca nos produtos, escolhe à vista ou parcelado, e manda o recibo no WhatsApp.
- **Catálogo:** produtos com foto e preço, enviados no WhatsApp com um toque.

Em "Minha conta" ficam o nome, a marca, a assinatura, o "Indique e ganhe", a importação e exportação de planilhas (.xlsx ou .csv) e o botão de sair.

É um site que se instala no celular como app (PWA), feito com React + Vite, hospedado na Vercel, com banco e login no Supabase.

## Como colocar no ar

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, cole e rode o conteúdo de `supabase/migrations/001_inicial.sql`. Ele cria as tabelas, a segurança (cada usuária só vê os próprios dados) e o espaço das fotos.
3. Em **Authentication → URL Configuration**, coloque o endereço do site da Vercel em **Site URL** e também em **Redirect URLs**.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

### 2. Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com), crie uma credencial **OAuth client ID** do tipo **Web application**.
2. Em **Authorized redirect URIs**, coloque `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. No Supabase, em **Authentication → Providers → Google**, ative e cole o Client ID e o Client Secret.
4. Na Vercel, crie a variável `VITE_LOGIN_GOOGLE=true` e faça um novo deploy. Sem ela, o botão "Entrar com Google" fica escondido.

### 3. Vercel

1. Importe este repositório na [Vercel](https://vercel.com). Ela detecta o Vite sozinha.
2. Em **Environment Variables**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do passo 1.
3. Faça o deploy.

### 4. Assinatura (Stripe) e Indique e ganhe

Cada conta nova ganha 14 dias grátis. Depois custa R$ 19,90 por mês: no cartão (com Apple Pay e Google Pay), a cobrança é automática; no Pix, ela paga um mês por vez. Vencida, a usuária continua vendo tudo por mais 3 dias de tolerância e depois não grava nada novo até pagar. Os dados nunca são apagados.

No "Indique e ganhe", cada usuária tem um link (`/?convite=CODIGO`). A cada 3 amigas que se cadastram pelo link e pagam, ela ganha 1 mês grátis, sem limite. A indicação só conta 7 dias depois do primeiro pagamento da amiga, e é anulada se esse pagamento for estornado.

1. No Supabase, rode `supabase/migrations/003_assinatura_e_indicacao.sql` no SQL Editor.
2. No [Stripe](https://dashboard.stripe.com), abra a conta (pessoa física com CPF serve). Em **Catálogo de produtos**, crie o produto "ClienteConecta" com um preço **recorrente mensal de R$ 19,90** e copie o ID do preço (`price_...`).
3. Em **Configurações → Pagamentos → Formas de pagamento**, deixe Cartão, Apple Pay e Google Pay ligados. O Pix no Stripe é liberado por convite: quando estiver ativo, ligue-o ali também.
4. Em **Configurações → Billing → Portal do cliente**, ative o portal (é onde ela troca o cartão ou cancela).
5. Em **Desenvolvedores → Webhooks**, crie um destino para `https://SEU-SITE/api/stripe-webhook` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` e `charge.refunded`. Copie o segredo (`whsec_...`).
6. Na Vercel, crie as variáveis abaixo e faça um novo deploy. A rotina diária que dá os meses grátis roda sozinha pelo `vercel.json`.

| Variável | De onde vem |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Desenvolvedores → Chaves de API (`sk_live_...`) |
| `STRIPE_PRECO_MENSAL` | ID do preço do passo 2 (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook do passo 5 (`whsec_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → chave `service_role` (nunca use no app, só aqui) |
| `CRON_SECRET` | Uma senha longa qualquer; a Vercel usa para chamar a rotina diária |
| `VITE_PAGAR_PIX` | `true` só depois que o Pix estiver ativo no Stripe; sem ela o botão do Pix fica escondido |

Para testar antes de cobrar de verdade, use as chaves de teste do Stripe (`sk_test_...`) e o cartão `4242 4242 4242 4242`.

## Rodar no computador

```bash
cp .env.example .env.local   # e preencha com os dados do Supabase
npm install
npm run dev
npm test                     # testes das regras (datas, lembretes, planilhas, WhatsApp)
```

## Planilhas

As colunas aceitas são:

- **Clientes:** `nome`, `whatsapp`, `aniversario` (25/12 ou 25/12/1960), `observacao`
- **Produtos:** `nome`, `preco` (49,90), `recompra_dias` (ex.: 30), `descricao`

Maiúsculas e acentos no cabeçalho não importam, e linhas com nome repetido são puladas. O jeito mais fácil é baixar a planilha no app e usar como modelo.

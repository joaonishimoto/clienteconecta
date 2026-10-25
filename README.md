# ClienteConecta

App simples para revendedoras e franqueadas organizarem clientes, vendas e lembretes. Funciona para qualquer marca: cada pessoa monta o próprio catálogo e coloca o nome da marca que revende.

O app tem quatro abas fixas no rodapé:

- **Hoje:** quem chamar no dia (parcelas para cobrar, aniversários e clientes na hora de repor um produto), cada um com o botão "Chamar no WhatsApp" e a mensagem pronta.
- **Clientes:** cadastro com nome, WhatsApp e aniversário, e a ficha com o histórico de compras e o que falta receber.
- **Vender:** escolhe a cliente, toca nos produtos, escolhe à vista ou parcelado, e manda o recibo no WhatsApp.
- **Catálogo:** produtos com foto e preço, enviados no WhatsApp com um toque.

Em "Minha conta" ficam o nome, a marca, a importação e exportação de planilhas (.xlsx ou .csv) e o botão de sair.

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

### 3. Vercel

1. Importe este repositório na [Vercel](https://vercel.com). Ela detecta o Vite sozinha.
2. Em **Environment Variables**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do passo 1.
3. Faça o deploy.

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

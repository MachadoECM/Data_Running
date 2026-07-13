# split. — dashboard pessoal de corrida (Strava)

Site estático + funções serverless que puxam seus dados **diretamente da API do Strava**:
totais vitalícios (desde a sua primeira atividade), volume semanal, corridas recentes e a rota
da última corrida desenhada a partir do stream de GPS real.

## Por que "totais vitalícios" e não uma lista de todas as atividades?

A Strava tem um endpoint dedicado — `GET /athletes/{id}/stats` — que devolve a distância e a
contagem de corridas **desde o início da conta** em uma única chamada. É isso que o
`api/stats.js` usa. Não precisamos (e não deveríamos) paginar milhares de atividades toda vez
que a home carrega — isso seria lento e desnecessário.

## Estrutura

```
index.html        página única, minimalista
style.css
app.js             busca /api/stats, /api/activities, /api/weekly, /api/route
                    e cai para dados de exemplo se o backend não responder
api/
  stats.js         totais vitalícios + do ano (GET /athletes/{id}/stats)
  activities.js    todas as atividades desde 01/jan do ano atual (paginado) — alimenta a
                   tabela de atividades recentes E o gráfico de setores, com filtro de
                   período (7 dias / semana anterior / mês / ano) feito no front-end
  weekly.js        agrega as últimas ~9 semanas em km/semana (corrida) + tempo por
                   modalidade da semana atual, para o gráfico de setores
  insights.js      histórico completo: dias da semana, pace médio, resumo por modalidade,
                   e a progressão diária (heatmap tipo GitHub) por ano
  prs.js           recordes pessoais (400m até maratona)
  gear.js          tênis ativos e inativos (km acumulado), com filtro no front-end
  mapdata.js       cidade onde você mais corre (clustering + Nominatim), sem rotas/trajetos
  auth/login.js    inicia o OAuth com o Strava
  auth/callback.js recebe o code e devolve o refresh_token
lib/strava.js       renovação de token + client HTTP
```

## Passo a passo

### 1. Criar o app na Strava

1. Acesse https://www.strava.com/settings/api
2. Crie um app (qualquer nome/ícone). Em **Authorization Callback Domain**, coloque o domínio
   onde você vai publicar (ex: `split-everson.vercel.app`) — sem `https://`.
3. Anote o `Client ID` e o `Client Secret`.

### 2. Publicar na Vercel

```bash
npm install -g vercel   # se ainda não tiver
cd site
vercel                  # segue o assistente, aceita os defaults
```

Isso já publica o front-end e as funções em `/api`. Anote a URL gerada (ex:
`https://split-everson.vercel.app`).

### 3. Configurar as variáveis de ambiente

No painel da Vercel → seu projeto → **Settings → Environment Variables**, adicione:

```
STRAVA_CLIENT_ID=<do passo 1>
STRAVA_CLIENT_SECRET=<do passo 1>
```

Redeploy (`vercel --prod`) para que as variáveis fiquem disponíveis.

### 4. Autorizar sua conta (uma vez só)

Acesse `https://SEU-DOMINIO/api/auth/login`, aprove o acesso no Strava. A página de callback
vai te mostrar um `STRAVA_REFRESH_TOKEN`. Copie esse valor, cole também nas variáveis de
ambiente da Vercel, e faça um último `vercel --prod`.

### 5. Pronto

Abra o site — os cards do topo, o gráfico semanal, a tabela de corridas e a rota devem
carregar com seus dados reais. A bolinha ao lado do seu nome fica verde quando os dados são
ao vivo (e amarela se cair para o modo de exemplo, o que acontece se as env vars não
estiverem configuradas).

## Limitações conhecidas / próximos passos

- **Rotação de refresh_token**: a Strava pode emitir um novo `refresh_token` a cada renovação.
  Para uso pessoal (poucas renovações por dia) isso raramente causa problema, mas para robustez
  de verdade, troque o armazenamento em env var por algo persistente e gravável em runtime —
  Vercel KV, Upstash Redis, ou até um arquivo em um bucket S3/Supabase. `lib/strava.js` já tem
  um comentário indicando onde plugar isso.
- **PRs (`api/prs.js`)**: a Strava não expõe um endpoint de "melhores marcas vitalícias" (a
  tabela que aparece no seu perfil em strava.com). Por isso `data/prs-seed.json` guarda esses
  valores reais (copiados de lá uma vez), e a rota só sobrescreve uma distância se encontrar uma
  corrida recente mais rápida — ou seja, PR novo é detectado automaticamente, mas o "chão" é
  sempre o dado real. Se quiser resincronizar depois de uma prova, é só atualizar esse JSON com
  os valores atuais da página "Melhores marcas" do seu perfil.
- **Clima**: a API pública do Strava não expõe condições de tempo por atividade — esse dado só
  aparece dentro do app deles, não é liberado pra apps de terceiros. Pra ter isso, seria preciso
  integrar uma API de clima histórico à parte (ex: Open-Meteo, Visual Crossing) cruzando
  coordenada + data/hora de cada corrida — não incluído aqui.
- **Zonas de pace (`data/pace-zones-seed.json`)**: mesma limitação dos PRs — a API pública do
  Strava não expõe zonas de corrida (só `heart_rate` e `power`). Os 6 limiares de velocidade
  foram copiados uma vez da sua conta e ficam nesse JSON. Atualize manualmente se sua referência
  de meia maratona mudar.
- **`api/insights.js`**: pagina até 6.000 atividades (30 páginas de 200) pra cobrir seu
  histórico inteiro — esse número já foi 1.600 (8 páginas) e truncava atividades bem antigas
  (ex: início de 2022) porque a Strava pagina do mais recente pro mais antigo; se sua conta
  seguir crescendo muito, aumente o `maxPages` no arquivo.
- **QR code**: gerado no navegador via uma biblioteca externa (cdnjs). Funciona normalmente no
  site publicado (que tem internet), mas pode não aparecer numa pré-visualização totalmente
  offline — o link abaixo do QR sempre funciona como alternativa.
- **Rate limits**: a API do Strava tem limite de 200 requisições/15min e 2.000/dia por app. As
  rotas mais "caras" são `prs.js` (detalhe de até 8 atividades) e `insights.js` (até 8 páginas de
  listagem) — os `Cache-Control` de 24h em cada uma ajudam bastante.

## Mapas (MapLibre + OpenStreetMap — grátis, sem token)

Dois mapas no site, ambos com **MapLibre GL** (fork open-source do Mapbox GL JS) + estilo
gratuito da CARTO, sem conta nem chave necessária:

1. **Estatísticas do recorde** (logo abaixo de "Recordes pessoais") — clique em 5km/10km/15km/10
   milhas/meia/30km/maratona pra ver distância, ritmo médio, tempo em movimento, elevação,
   calorias e FC média daquela corrida (dados reais em `data/prs-seed.json`, copiados dos
   cartões de compartilhamento do Strava). **Atualiza sozinho**: como `api/prs.js` já busca o
   detalhe completo de cada atividade candidata durante a varredura, um PR novo dentro dessa
   janela substitui automaticamente tanto o tempo quanto essas estatísticas — sem precisar editar
   nada manualmente.
2. **Top 5 cidades onde mais corri** — agrupa todo o seu histórico de corridas por localização
   aproximada (grade de ~5km), geocodifica cada cluster via Nominatim (OpenStreetMap, grátis) —
   pegando cidade **e país** — e **funde clusters que resolvem pro mesmo nome de cidade+país**
   antes de rankear — sem isso, uma cidade grande como São Paulo apareceria fatiada em vários
   "lugares" diferentes, e clusters distantes que geocodificam pro mesmo nome (ex: dois bairros
   de Passos-MG) apareceriam duplicados. Pra localidades pequenas/atípicas (ex: ilhas como
   Curaçao) onde o Nominatim não preenche o campo "cidade" padrão, há uma cadeia de fallback
   (município → ilha → estado) pra não cair em coordenadas cruas. A bandeirinha ao lado do nome
   vem do `country_code` (ISO 3166-1) que o Nominatim devolve, convertido pra emoji de bandeira
   no front-end — mais confiável que tentar mapear o nome do país em texto.

**Limite de uso do Nominatim**: no máximo 1 requisição/segundo. Como geocodificamos até 15
clusters brutos antes de fundir (pra sobrar pelo menos 5 cidades distintas depois da fusão),
isso adiciona ~16 segundos à resposta do `api/mapdata.js` (com um `sleep` entre chamadas). Isso
é cacheado por 24h (`Cache-Control`), então não repete a cada visita — mas se a função da
Vercel der timeout, reduza o `.slice(0, 15)` no arquivo.

## Cache do navegador (importante ao editar)

`index.html` referencia `style.css?v=3` e `app.js?v=3` — esse `?v=` existe só pra forçar o
navegador a buscar a versão nova depois de um redeploy. **Sempre que editar `style.css` ou
`app.js`, aumente esse número em `index.html`** (`v=4`, `v=5`...), ou o navegador de quem já
visitou o site pode continuar usando uma cópia antiga em cache mesmo depois do `vercel --prod`.

## Machine learning features

One from-scratch ML feature, implemented in **Python** (`lib_py/ml.py`, `api/predict.py`) using
numpy + scikit-learn — the site's only language-agnostic serverless function, running
alongside the Node.js backend on Vercel (auto-detected via `requirements.txt`). Both the
dashboard and the Model Lab page fetch results from this single endpoint, so there's one
canonical implementation, not a JS/Python comparison.

1. **Race time predictor** — personalized Riegel-style power-law fit (`time = a * distance^b`)
   via log-log linear regression (`sklearn.linear_model.LinearRegression`) on the athlete's
   own PR distances, adjusted by a recent-form factor (last 45 days' avg pace vs. all-time avg
   pace, clamped to ±8%). Evaluated via leave-one-out cross-validation
   (`sklearn.model_selection.LeaveOneOut`) — Mean Absolute Error, Mean Absolute Percentage
   Error, and R² are all reported on the Model Lab page.

Limitations worth knowing:
- The race predictor needs at least 3 of the athlete's PR distances to fit a curve.

**Note**: a workout-type auto-classification model (k-means clustering on pace, duration,
speed burst, and heart rate) was built, tuned across several iterations (feature selection,
k-means++ init, multi-restart, robust scaling), and ultimately removed — it never reliably
matched the athlete's real training structure well enough to keep on the site. `lib/ml.js`
was trimmed back down to just what the race predictor needs.

## ML Lab page (ml.html)

A separate page, linked from the dashboard header ("ML Lab"), with a deeper technical
write-up of both ML features — the math, the reasoning, small pseudocode blocks — plus your
own text (there are `<!-- REPLACE ME -->` placeholders in `ml.html` marking where to drop in
your own copy). It pulls the same live `/api/insights` results shown on the dashboard, so the
numbers always match.

Files involved:
- `ml.html` — the page itself, using the same design system as the dashboard
- `ml-page.js` — small script just for this page (separate from `app.js` on purpose, since
  `app.js` assumes dashboard-only elements exist and would throw errors here)
- `theme.js` — the dark/light toggle logic, extracted out of `app.js` since both pages need it

## Python: the race predictor's implementation

The rest of the backend runs on Node.js, but Vercel also supports Python serverless
functions in the same project — so `api/predict.py` implements the race-prediction model
(`lib_py/ml.py`) using **numpy + scikit-learn**. Both the dashboard (`index.html`/`app.js`)
and the Model Lab page (`ml.html`/`ml-page.js`) fetch this single endpoint for the Race
Time Predictor — there's no separate JS implementation of this model anymore, so the two
pages always show the same numbers.

Setup:
- `requirements.txt` at the project root lists `numpy`, `scikit-learn`, `requests` — Vercel
  auto-detects this and builds the Python runtime alongside the Node functions, no extra
  config needed.
- `lib_py/strava.py` is a Python port of `lib/strava.js`'s OAuth token refresh, using the
  same `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `STRAVA_REFRESH_TOKEN` env vars already
  configured — nothing new to set up.
- `api/predict.py` computes its own recent-form factor via a lightweight 180-day activity
  fetch (not the full-history scan `api/insights.js` does), since that's all the form-factor
  calculation needs.

## Domínio personalizado

Pra trocar de `split-strava.vercel.app` para algo como `everson-data-running.vercel.app`
(subdomínio grátis da própria Vercel):

1. Acesse https://vercel.com/everson-cardozo/split-strava/settings/domains
2. Em **Add Domain**, digite `everson-data-running.vercel.app` e confirme
3. Pronto — o site passa a responder também nesse endereço (o antigo continua funcionando)

Se preferir um domínio de verdade (ex: `eversoncardozo.run`), é preciso registrá-lo antes num
serviço como Registro.br, Namecheap ou GoDaddy, e depois adicioná-lo do mesmo jeito na aba
Domains — a Vercel mostra os registros DNS que você precisa apontar no seu provedor.


## Estatísticas de corrida (gráficos)

Inspirado na página "Statistics Run" do site de referência. Tudo desenhado em SVG puro (sem
biblioteca de gráficos), com dados de `api/insights.js`:

- Distância anual, atividade por horário (radar polar), distância média por dia da semana
  (radar), distribuição de distâncias, indoor vs outdoor (usa o campo `trainer` da Strava),
  distribuição de pace, zonas de frequência cardíaca, pace vs FC (dispersão)
- **Não incluído**: temperatura e condições de clima — mesma limitação já citada acima (API do
  Strava não expõe isso)
- FC só aparece nos gráficos se as atividades tiverem `has_heartrate: true` (monitor conectado)

## Rodando localmente

```bash
vercel dev
```

Isso simula as funções serverless localmente em `http://localhost:3000`.

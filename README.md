# Sussa

**Sussa é um Pomodoro tranquilo para estudar e trabalhar.** Cronômetro, tarefas, notas, estatísticas e ambientes com som e paisagem, tudo funcionando no seu computador, sem conta e sem servidor.

> *Sussa is a local-first Pomodoro workspace (Portuguese UI) for Linux, Windows and the browser. No account, no cloud: your data stays on your machine.*

- 🍅 **Pomodoro configurável**: foco de 50 min, pausa curta de 10 e longa de 20 (você ajusta).
- 🗂️ **Salas Estudos e Trabalho**: tarefas e tempo de foco separados por contexto.
- 📊 **Estatísticas** por dia, semana, mês e ano, com filtro por sala.
- 📝 **Notas rápidas** com busca, fixação e download em `.txt`.
- 🌧️ **Sons offline**: chuva binaural, lo-fi, jazz, oceano e lareira, com fundo de floresta ou neutro quando não há internet.
- 📺 **Vídeos do YouTube como fundo**: catálogo curado com Study with me, Lo-fi e jazz, Mar, Chuva, Floresta, Céu e Cidade, com filtro de dia e noite.
- 🔋 **Modo na barra** (desktop): a janela some e o tempo fica correndo na barra do sistema, gastando menos bateria. Um clique no tempo mostra a sessão, pausa e controles de volume.
- 🪟 **Painéis arrastáveis** e **modo foco**, que esconde as ferramentas quando você para de mexer.
- 🔒 **Local de verdade**: SQLite no desktop, `localStorage` no navegador. Nada é enviado para fora.

## Versão 0.3.5

**Miniplayer redesenhado:** vídeo sem cronômetro sobreposto e faixa escura inferior com tempo, pausa, reinício e identificação do ambiente. Corrigida a inicialização X11/XWayland no Linux para que **Sempre à frente** funcione de verdade. Inclui a categoria **Chuva** e a ajuda do contador na barra do Windows.

## Instalar

Um comando instala a última versão publicada em [Releases](https://github.com/LucasDpaulo/sussa/releases). Não precisa de Node.js, git nem npm. Para atualizar, rode o mesmo comando de novo.

**Linux (x64)**, no terminal:

```sh
curl -fsSL https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.sh | bash
```

Em Ubuntu/Debian, instala o `.deb`: o `apt` instala o que faltar e pede sua senha. Nas outras distribuições, coloca o AppImage em `~/.local/bin/sussa` (requer `libfuse2`). Depois, abra pelo menu de aplicativos ou com o comando `sussa`.

**Windows (x64)**, no PowerShell:

```powershell
irm https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.ps1 | iex
```

Baixa e abre o instalador. Ele ainda não tem assinatura digital, então o Windows pode mostrar o aviso do SmartScreen: clique em **Mais informações → Executar assim mesmo**.

<details>
<summary>Opções de instalação</summary>

| Variável | Efeito |
|---|---|
| `SUSSA_VERSION=v0.3.5` | Instala uma versão específica, inclusive pre-releases |
| `SUSSA_FORMAT=appimage` | Linux: usa o AppImage mesmo em sistemas com `apt` |
| `SUSSA_SILENT=1` | Windows: instala sem abrir o assistente |

```sh
# Linux
curl -fsSL https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.sh | SUSSA_VERSION=v0.3.5 bash
```

```powershell
# Windows
$env:SUSSA_VERSION = 'v0.3.5'; irm https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.ps1 | iex
```

Se preferir não rodar um script da internet, baixe o `.deb`, o AppImage ou o `.exe` direto da página de [Releases](https://github.com/LucasDpaulo/sussa/releases). Os scripts são curtos e podem ser lidos antes: [`install.sh`](install.sh) e [`install.ps1`](install.ps1).

</details>

## Rodar a partir do código

Requer **Node.js 22 ou posterior** e npm.

```sh
git clone https://github.com/LucasDpaulo/sussa.git
cd sussa
npm ci
```

| Comando | O que faz |
|---|---|
| `npm start` | Versão de navegador em http://127.0.0.1:5173 (não precisa de `npm ci`) |
| `npm run desktop` | Abre o app desktop (Electron) |
| `npm test` | Testes de lógica, áudio e persistência |
| `npm run test:desktop` | Teste ponta a ponta do app desktop (requer sessão gráfica) |
| `npm run pack:linux` | Gera `.deb` e AppImage em `release/` |
| `npm run pack:windows` | Gera o instalador `.exe` em `release/` (rodar no Windows) |

O teste desktop usa um perfil temporário. Em ambientes isolados que bloqueiam o sandbox do Chromium, como containers e CI, use `npm run test:desktop -- --no-sandbox`. Isso vale só para o teste: no uso normal, o app roda com o sandbox ligado.

### Estrutura

```
src/
  app.js, app.css           interface principal
  workspace.js, .css        painéis móveis, ambientes e modo foco
  core.js                   cronômetro e agregação do histórico
  audio.js, ambience.js     mixer de áudio e músicas offline
  notes.js                  notas com busca
  tray.js                   modo na barra do sistema (desktop)
  youtube.js, youtube-catalog.js  catálogo de vídeos do YouTube
  google-account.js         seção Conta Google em Aparência
  scene-bar.js              barra de controle do vídeo de fundo
  calendar.js               integração opcional, somente leitura, com o Google Agenda
desktop/
  main.cjs, preload.cjs     processo principal do Electron
  store.cjs                 persistência em SQLite
  google.cjs                conta Google (login, Agenda e YouTube) no desktop
  youtube.cjs               playlists públicas paginadas do YouTube (desktop e servidor web)
assets/                     imagens e áudios (ver Créditos)
tests/                      testes com node:test
server.mjs                  servidor de desenvolvimento, só em 127.0.0.1
install.sh, install.ps1     instaladores de um comando
```

## Vídeos do YouTube

Em **Ambientes → Explorar vídeos do YouTube**, escolha uma categoria e clique no vídeo para usá-lo como fundo. Nas paisagens (Mar, Chuva, Floresta, Céu e Cidade), dá para filtrar entre **Dia** e **Noite**. Os vídeos de música, como Study with me e Lo-fi, começam com som. Os outros começam sem som. O som, a pausa e o enquadramento ficam na barra discreta do rodapé.

- Os canais são escolhidos a dedo em `src/youtube-catalog.js`. A lista carrega lotes de 30 vídeos ao rolar perto do fim, buscando páginas das playlists públicas dos canais. O nicho e o filtro de dia/noite são mantidos, sem repetir vídeos. Também há um botão para carregar mais ou tentar novamente após uma falha de conexão. Não precisa de conta nem de chave de API. Vídeos curtos (Shorts) ficam de fora.
- Com um vídeo no fundo, aparece uma **barra discreta no rodapé** com pausar, silenciar, volume, **Inteiro / Preencher** e a qualidade atual. **Inteiro** é o padrão: o vídeo aparece todo e centralizado. **Preencher** cobre a tela e corta as bordas.
- O YouTube escolhe a qualidade sozinho, pelo tamanho do player e pela internet, e não aceita pedido de qualidade vindo de apps. Por isso o Sussa renderiza o player com pelo menos 1920×1080, mesmo quando ele aparece menor na tela, e assim mantém 1080p.
- Os vídeos tocam pelo player oficial do YouTube e **podem exibir anúncios**. Se o autor proibir tocar o vídeo fora do YouTube, o Sussa avisa e o vídeo fica marcado.
- Na versão web, o `npm run dev` busca as playlists por você, porque o YouTube não permite que a página os leia diretamente.
- A paginação depende do formato público das playlists do YouTube, que pode mudar. As coleções de **Sua conta** mantêm o carregamento existente. Teste isolado de rolagem, filtros e recuperação de conexão: `npm run test:youtube` (em ambiente restrito de desenvolvimento, pode exigir `-- --no-sandbox`).
- No modo na barra, um vídeo de fundo sem som é pausado para economizar bateria e volta quando a janela reaparece.

## Picture-in-picture (desktop)

Clique no ícone de **janela pequena** no canto superior direito, ao lado da tela cheia, ou use **Ctrl+Shift+P**. O Sussa fica compacto, mantendo o ambiente, o cronômetro e o áudio da mesma sessão. O vídeo ocupa a área superior; tempo, pausa e reinício ficam na faixa inferior. Os controles do vídeo aparecem ao passar o mouse ou navegar pelo teclado. Arraste a barra de título para mover e as bordas para aumentar ou diminuir (mínimo de 320×240).

- O **alfinete** ativa ou desativa **Sempre à frente**; a cor destaca quando está ativo.
- O botão **Voltar ao tamanho normal**, **Esc** ou **Ctrl+Shift+P** restaura a janela e os painéis anteriores.
- O modo compacto inicia sem fixação. Fechar ou mandar para a barra mantém o comportamento normal do aplicativo.

Disponível no aplicativo desktop. No Linux, o Sussa inicia com `--ozone-platform=x11` quando há X11/XWayland disponível. O parâmetro precisa estar presente antes de o Electron iniciar; defini-lo depois no JavaScript não funciona. O atalho instalado já inclui esse parâmetro e a abertura direta também é tratada. Se você escolher explicitamente Wayland nativo, o alfinete fica desabilitado porque esse backend não permite fixação pelo Electron. O modo compacto não é oferecido na versão de navegador.

## Modo na barra (desktop)

Clique em **⇲** no canto superior direito ou use **Ctrl+M**. A janela se esconde e a barra do sistema passa a mostrar o tempo restante, contando a cada segundo, com uma linha de progresso embaixo: laranja no foco, verde na pausa, e o tempo fica apagado quando pausado. No Windows, a bandeja só tem espaço para os minutos.

**Windows — contador fora da seta:** entre no modo barra, abra a seta de ícones ocultos e arraste o contador para perto do relógio. Também pode ativar o Sussa em **Configurações → Personalização → Barra de tarefas**, na seção de ícones da bandeja/área de notificação. O menu do contador tem **Mostrar contador ao lado do relógio…**, com um atalho para essas configurações. O Windows controla a visibilidade; o aplicativo não pode forçá-la. A identificação do ícone permanece estável entre atualizações instaladas no mesmo caminho.

Clique no número para ver a sessão e o horário de término, pausar ou retomar e, se houver som tocando, ajustar o volume geral ou silenciar tudo, inclusive os players. O volume aparece como uma barra (🔊 ▰▰▰▰▰▰▱▱▱▱ 60%). Clique nela para silenciar e use **＋/－** para ajustar. Os menus de bandeja do Ubuntu só aceitam texto, então não dá para arrastar. **Duplo clique no tempo** ou **Abrir Sussa** traz a janela de volta, assim como abrir o app de novo pelo menu.

O **X** da janela segue o timer: se ele estiver rodando, o Sussa vai para a barra e continua contando. Se estiver parado, o app fecha. Para fechar de vez com o timer rodando, use **Sair** no menu da barra ou **Ctrl+Q**.

Para economizar bateria, o vídeo de fundo pausa enquanto a janela está escondida e o estado é gravado uma vez por minuto em vez de a cada segundo. O cronômetro não perde tempo: ele é calculado pelo relógio.

## Seus dados

- **Desktop:** histórico, tarefas, notas e preferências ficam em `workspace.sqlite`, em `~/.config/sussa` no Linux e em `%APPDATA%\sussa` no Windows. O botão **⚙ Aparência → Abrir pasta dos dados** mostra o local exato. Para fazer backup, feche o app e copie a pasta.
- **Navegador:** os dados ficam no `localStorage` daquele navegador e endereço. Limpar os dados do site apaga o histórico. Use **Exportar histórico** para guardar uma cópia em JSON.
- Os dados não são sincronizados nem criptografados, e o desktop e o navegador não compartilham dados entre si.
- Sem internet, funcionam o cronômetro, as tarefas, as notas, as estatísticas e os ambientes incluídos. Só os vídeos do YouTube, os players por URL do painel Mídia (YouTube, Spotify, Apple Music) e o Google Agenda dependem de internet.

### Como o cronômetro se comporta

O tempo é medido pelo relógio, não por contagem de ticks, então o estado volta ao recarregar ou reabrir. Se você fechar com uma sessão rodando, ela continua contando até o fim. Pause antes de fechar para evitar isso. As **4 bolinhas** ao lado do título do painel Pomodoro mostram o ciclo: cada foco concluído até o fim preenche uma. Pausas curtas e longas não contam, e um foco interrompido também não. Concluir a pausa longa zera o ciclo, assim como a virada do dia. Um quinto foco sem pausa longa começa um ciclo novo. O alarme só toca com o app aberto. Nenhuma etapa começa sozinha. Na versão de navegador, só uma aba por vez pode registrar foco.

## Conta Google no app desktop (opcional)

Em **⚙ Aparência → Conta Google**, cada serviço tem o seu botão **Conectar**, que pede só a permissão daquele serviço. Dá para ligar só a Agenda, só o YouTube ou os dois, e o segundo se soma ao primeiro sem refazer nada. Tudo é **somente leitura**:
- **Agenda**: os eventos do dia aparecem no painel Tarefas e podem virar tarefas.
- **YouTube**: a categoria **★ Sua conta** em Explorar YouTube, com seus vídeos curtidos, os vídeos recentes dos canais que você assina e suas playlists.

O login abre na página do Google, no navegador, e volta para o Sussa por um endereço local (`127.0.0.1`). O Sussa nunca vê a sua senha. Os tokens ficam só no processo principal do app, cifrados com o chaveiro do sistema, e a página nunca os recebe. **Desconectar conta** revoga o acesso no Google.

O vídeo continua tocando pelo player incorporado, sem a sua sessão do YouTube. Por isso o Premium não se aplica e podem aparecer anúncios.

### Para mantenedores: credenciais embutidas

Para que quem usa só precise clicar em **Conectar**, o pacote leva as credenciais OAuth do app em `desktop/google-client.json`. Esse arquivo fica fora do git (está no `.gitignore`):

```json
{ "clientId": "…apps.googleusercontent.com", "clientSecret": "GOCSPX-…" }
```

Para criá-las (uma vez, de graça):
1. Em [console.cloud.google.com](https://console.cloud.google.com/), crie um projeto (por exemplo, "Sussa").
2. Em **APIs e serviços → Biblioteca**, ative a **Google Calendar API** e a **YouTube Data API v3**.
3. Em **Tela de consentimento OAuth** (Google Auth Platform), escolha **Externo** e preencha nome e e-mail de contato. Enquanto o app estiver em teste, adicione como **usuários de teste** os e-mails de quem vai usar (até 100).
4. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, escolha o tipo **App para computador**.

Em apps instalados, o Google não trata o client secret como segredo (ele vai dentro do pacote). Enquanto o app não for verificado pelo Google, a tela de login mostra "o Google não verificou este app" (clique em **Continuar**). Para liberar a qualquer pessoa sem esse aviso, é preciso enviar o app para verificação, com página inicial e política de privacidade.

Sem o arquivo, por exemplo num fork, a seção mostra **Credenciais próprias do Google Cloud**, onde quem usa cola as próprias credenciais.

## Google Agenda na versão web (opcional)

O Sussa pode listar os eventos do dia da sua agenda Google, inclusive a que você usa pelo Notion Calendar, e transformá-los em tarefas locais. A integração é **somente leitura**, com o escopo `calendar.events.readonly`. Hoje está disponível só na versão de navegador e **ainda não foi validada com uma conta real**.

<details>
<summary>Configurar</summary>

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e ative a **Google Calendar API**.
2. Configure a tela de consentimento OAuth. Se o app estiver em modo de teste, adicione seu e-mail como usuário de teste.
3. Crie um **OAuth Client ID** do tipo **Web application**, com a origem autorizada `http://127.0.0.1:5173`.
4. No Sussa, abra **Conectar agenda** e cole só o **Client ID público** (termina em `.apps.googleusercontent.com`). Nunca use o Client Secret.
5. Deixe a agenda como `primary` ou informe o ID dela, que fica em Google Agenda → Configurações → Integrar agenda.
6. Clique em **Preparar conexão** e depois em **Entrar com Google**.

O token fica só na memória: ao recarregar a página, é preciso entrar de novo. Referências: [token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) e [events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).

</details>

## Limitações conhecidas

- Há pacotes só para **x64**. O instalador do Windows ainda não tem assinatura digital e não foi validado em uma máquina Windows real.
- Existe um único perfil local por usuário do sistema. Ainda não há importação de backup nem sincronização.
- No desktop, players externos podem ter restrições de reprodução.
- O modo na barra depende de suporte a ícones de bandeja. O Ubuntu já vem com ele. No GNOME puro, instale a extensão *AppIndicator*. Sem ela, o ícone não aparece, mas abrir o Sussa de novo traz a janela de volta.
- O `npm audit` aponta 6 avisos moderados na cadeia de desenvolvimento do `electron-builder`. O app não tem dependências npm em produção.

## Contribuir

Contribuições são bem-vindas: correções, ideias, traduções, novos ambientes.

1. Abra uma [issue](https://github.com/LucasDpaulo/sussa/issues) para contar o bug ou discutir a ideia antes de uma mudança grande.
2. Faça um fork e crie sua branch a partir de **`dev`**, que é onde entra o desenvolvimento. A `main` guarda a versão de referência.
3. Rode `npm test` (e `npm run test:desktop`, se mexeu no desktop) antes de abrir o pull request.
4. Abra o PR contra a `dev`, explicando o que mudou e como testar.

Os commits seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), por exemplo `feat: ...`, `fix: ...` e `docs: ...`. A interface e a documentação são em português.

**Mídias novas:** só aceite arquivos com licença que permita redistribuição (CC0, CC BY, Pexels License etc.). Registre fonte, autor, licença e alterações em [`assets/media-credits.json`](assets/media-credits.json).

## Versões

O projeto segue [versionamento semântico](https://semver.org/lang/pt-BR/). Cada versão é uma tag `vX.Y.Z` igual ao `version` do `package.json`.

Ao receber uma tag, o workflow [**Desktop packages**](.github/workflows/desktop.yml) roda os testes, gera o `.deb`, o AppImage e o `.exe` e cria uma **release em rascunho**, que só os mantenedores veem. Ela só fica pública, e só chega aos comandos de instalação, depois de publicada:

Exemplo para a próxima versão, `0.3.6` (a atual é `0.3.5`):

```sh
npm version 0.3.6 --no-git-tag-version   # atualiza package.json e package-lock.json
git commit -am "chore: release v0.3.6"
git tag v0.3.6
git push origin main v0.3.6
# depois de testar o rascunho em Releases:
gh release edit v0.3.6 --draft=false
```

Tags com sufixo, como `v0.3.6-beta.1`, viram **pre-release**: ficam públicas para quem quiser testar, mas os instaladores só as usam quando você informa a versão em `SUSSA_VERSION`.

## Créditos

As mídias incluídas têm licenças próprias, separadas da licença do código. Os detalhes, com links e alterações feitas, estão em [`assets/media-credits.json`](assets/media-credits.json), que acompanha os pacotes.

| Mídia | Autor | Licença |
|---|---|---|
| [Comfy](https://freelofi.com/track/comfy) (lo-fi) | Purrple Cat | CC BY 4.0 |
| [Jazz Brunch](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700074) | Kevin MacLeod (incompetech.com) | CC BY 4.0 |
| [Chuva binaural](https://freesound.org/people/chromakei/sounds/396578/) | chromakei | CC0 1.0 |
| [Trilha na floresta](https://unsplash.com/photos/a-dirt-path-in-the-middle-of-a-forest-GJJdGDsoomU) | Anton Sobotyak | Unsplash License |

Inspirado nas funções do [LifeAt](https://lifeat.io/).

## Licença

A licença do código ainda será definida. Até lá, o código está disponível para leitura, mas sem permissão formal de uso ou redistribuição.

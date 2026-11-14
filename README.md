# Sussa

**Sussa é um Pomodoro tranquilo para estudar e trabalhar.** Cronômetro, tarefas, notas, estatísticas e ambientes com som e paisagem, tudo funcionando no seu computador, sem conta e sem servidor.

> *Sussa is a local-first Pomodoro workspace (Portuguese UI) for Linux, Windows and the browser. No account, no cloud: your data stays on your machine.*

- 🍅 **Pomodoro configurável**: foco de 50 min, pausa curta de 10 e longa de 20 (você ajusta).
- 🗂️ **Salas Estudos e Trabalho**: tarefas e tempo de foco separados por contexto.
- 📊 **Estatísticas** por dia, semana, mês e ano, com filtro por sala.
- 📝 **Notas rápidas** com busca, fixação e download em `.txt`.
- 🌧️ **Ambientes offline**: chuva binaural, lo-fi, jazz, oceano e lareira, com cenários em vídeo ou imagem parada.
- 🪟 **Painéis arrastáveis** e **modo foco**, que esconde as ferramentas quando você para de mexer.
- 🔒 **Local de verdade**: SQLite no desktop, `localStorage` no navegador. Nada é enviado para fora.

## Instalar

Um comando instala a última versão publicada em [Releases](https://github.com/LucasDpaulo/sussa/releases). Não precisa de Node.js, git nem npm. Para atualizar, rode o mesmo comando de novo.

**Linux (x64)**, no terminal:

```sh
curl -fsSL https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.sh | bash
```

Em Ubuntu/Debian, instala o `.deb`: o `apt` instala o que faltar e pede sua senha. Nas outras distribuições, coloca o AppImage em `~/.local/bin/sussa` (requer `libfuse2`). Depois, abra com o comando `sussa`.

**Windows (x64)**, no PowerShell:

```powershell
irm https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.ps1 | iex
```

Baixa e abre o instalador. Ele ainda não tem assinatura digital, então o Windows pode mostrar o aviso do SmartScreen: clique em **Mais informações → Executar assim mesmo**.

<details>
<summary>Opções de instalação</summary>

| Variável | Efeito |
|---|---|
| `SUSSA_VERSION=v0.2.0` | Instala uma versão específica, inclusive pre-releases |
| `SUSSA_FORMAT=appimage` | Linux: usa o AppImage mesmo em sistemas com `apt` |
| `SUSSA_SILENT=1` | Windows: instala sem abrir o assistente |

```sh
# Linux
curl -fsSL https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.sh | SUSSA_VERSION=v0.2.0 bash
```

```powershell
# Windows
$env:SUSSA_VERSION = 'v0.2.0'; irm https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.ps1 | iex
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
  audio.js, ambience.js     mixer de áudio e combinações de ambiente
  notes.js                  notas com busca
  calendar.js               integração opcional, somente leitura, com o Google Agenda
desktop/
  main.cjs, preload.cjs     processo principal do Electron
  store.cjs                 persistência em SQLite
assets/                     imagens, áudios e cenários (ver Créditos)
tests/                      testes com node:test
server.mjs                  servidor de desenvolvimento, só em 127.0.0.1
install.sh, install.ps1     instaladores de um comando
```

## Seus dados

- **Desktop:** histórico, tarefas, notas e preferências ficam em `workspace.sqlite`, em `~/.config/sussa` no Linux e em `%APPDATA%\sussa` no Windows. O menu **Aplicativo → Abrir pasta dos dados** mostra o local exato. Para fazer backup, feche o app e copie a pasta.
- **Navegador:** os dados ficam no `localStorage` daquele navegador e endereço. Limpar os dados do site apaga o histórico. Use **Exportar histórico** para guardar uma cópia em JSON.
- Os dados não são sincronizados nem criptografados, e o desktop e o navegador não compartilham dados entre si.
- Sem internet, funcionam o cronômetro, as tarefas, as notas, as estatísticas e os ambientes incluídos. Só os players por URL (YouTube, Spotify, Apple Music), os vídeos por link e o Google Agenda dependem de internet.

### Como o cronômetro se comporta

O tempo é medido pelo relógio, não por contagem de ticks, então o estado volta ao recarregar ou reabrir. Se você fechar com uma sessão rodando, ela continua contando até o fim. Pause antes de fechar para evitar isso. O alarme só toca com o app aberto. Nenhuma etapa começa sozinha. Na versão de navegador, só uma aba por vez pode registrar foco.

## Google Agenda (opcional)

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
- O app usa o ícone padrão do Electron.
- Existe um único perfil local por usuário do sistema. Ainda não há importação de backup nem sincronização.
- No desktop, players externos podem ter restrições de reprodução, e o Google Agenda fica oculto.
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

```sh
npm version 0.3.0 --no-git-tag-version   # atualiza package.json e package-lock.json
git commit -am "chore: release v0.3.0"
git tag v0.3.0
git push origin main v0.3.0
# depois de testar o rascunho em Releases:
gh release edit v0.3.0 --draft=false
```

Tags com sufixo, como `v0.3.0-beta.1`, viram **pre-release**: ficam públicas para quem quiser testar, mas os instaladores só as usam quando você informa a versão em `SUSSA_VERSION`.

## Créditos

As mídias incluídas têm licenças próprias, separadas da licença do código. Os detalhes, com links e alterações feitas, estão em [`assets/media-credits.json`](assets/media-credits.json), que acompanha os pacotes.

| Mídia | Autor | Licença |
|---|---|---|
| [Comfy](https://freelofi.com/track/comfy) (lo-fi) | Purrple Cat | CC BY 4.0 |
| [Jazz Brunch](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700074) | Kevin MacLeod (incompetech.com) | CC BY 4.0 |
| [Chuva binaural](https://freesound.org/people/chromakei/sounds/396578/) | chromakei | CC0 1.0 |
| [Biblioteca](https://www.pexels.com/video/people-studying-inside-the-library-6334252/) | cottonbro studio | Pexels License |
| [Trabalho em casa](https://www.pexels.com/video/person-working-on-a-laptop-8472464/) | Cup of Couple | Pexels License |
| [Pôr do sol na praia](https://www.pexels.com/video/the-sun-sets-over-the-ocean-with-waves-26310139/) | Manoo Media | Pexels License |
| [Trilha na floresta](https://unsplash.com/photos/a-dirt-path-in-the-middle-of-a-forest-GJJdGDsoomU) | Anton Sobotyak | Unsplash License |

Inspirado nas funções do [LifeAt](https://lifeat.io/).

## Licença

A licença do código ainda será definida. Até lá, o código está disponível para leitura, mas sem permissão formal de uso ou redistribuição.

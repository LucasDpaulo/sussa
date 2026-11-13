# Meu Espaço

Pomodoro pessoal inspirado nas funções do LifeAt. Aplicativo local, em português, com salas Estudos e Trabalho.

## Ambientes offline — versão 0.2.0

Em **Ambientes**, aplique Estudo com chuva, Jazz no trabalho, Floresta chuvosa ou Fim de tarde. As combinações escolhem o cenário e ajustam música e sons. Em **Sons**, escolha Comfy (lo-fi) ou Jazz Brunch, ajuste o volume independente e ative movimento estéreo suave opcional. O volume geral e Silenciar controlam música, chuva e os sons sintetizados; players externos continuam com volume próprio.

Biblioteca, Trabalho em casa e Pôr do sol na praia têm vídeos locais sem áudio e versões estáticas. A floresta mantém a fotografia existente. A opção **Usar imagem parada** descarrega o vídeo para reduzir processamento. Os vídeos foram reduzidos para 1280px/24fps com uma transição de 1s na emenda; movimentos humanos podem revelar repetição. As mídias acrescentam aproximadamente 17 MB ao conteúdo do aplicativo.

A chuva usa um trecho da gravação binaural de chromakei, mantendo os dois canais, com sobreposição de 5s na emenda. A fonte foi a prévia HQ MP3 disponibilizada pelo Freesound, não o WAV original. O movimento estéreo da música é um efeito suave e opcional; não é gravação binaural nem promessa de efeito cognitivo. Lo-fi e jazz são faixas completas, em repetição, e não rádios online.

**Salvar minha combinação** guarda um conjunto de cenário, faixa, volumes e movimento estéreo. **Usar minha combinação** reaplica esse conjunto. As configurações ficam no SQLite no desktop, e no localStorage na versão de navegador. Ao reabrir, a música aguarda um clique em Reproduzir ou Aplicar combinação. Não há download remoto durante o uso dos ambientes incluídos.

As fontes, autores, licenças e modificações estão em [assets/media-credits.json](assets/media-credits.json), incluído nos pacotes. As mídias têm licenças próprias e não devem ser tratadas como código do projeto. Créditos também aparecem nos painéis. A floresta original mantém o crédito já documentado abaixo.

Validação: testes do mixer verificam silêncio da música, volume independente e alterações de volume durante o carregamento da chuva. O teste desktop reproduz os três vídeos e as duas músicas, alterna para imagem parada e verifica restauração da combinação após reiniciar, em perfil temporário. Como anteriormente, esse teste gráfico usa `--no-sandbox` somente no ambiente de desenvolvimento restrito; o pacote mantém o sandbox habilitado.

## Aplicativo desktop — primeira versão

A versão desktop usa Electron e funciona sem servidor ou conta online. O nome continua **Meu Espaço** até a definição da identidade do projeto. O foco desta entrega é abrir a interface em uma janela própria, registrar o foco e preservar os dados ao reabrir.

### Instalar no Linux (Ubuntu/Debian, x64)

Com o pacote `.deb` na pasta atual:

```sh
sudo apt install ./meu-espaco-pomodoro_0.2.0_amd64.deb
meu-espaco
```

Abra o aplicativo pelo comando `meu-espaco`; a entrada no menu do Linux fica oculta. A interface continua abrindo em uma janela. Para atualizar, instale o novo `.deb`; os dados ficam separados da instalação. Há também um AppImage em `release/`, que depende do suporte a FUSE e sandbox da distribuição. Prefira o `.deb` no Ubuntu/Debian. Não use `--no-sandbox` no uso normal.

### Windows (x64)

O comando `npm run pack:windows` gera um instalador NSIS em `release/`. Abra o instalador pelo Explorer ou execute no PowerShell:

```powershell
& '.\Meu Espaço Setup 0.2.0.exe'
```

Depois da instalação, abra pelo menu Iniciar. Os instaladores desta etapa não têm assinatura digital; a execução e instalação em Windows ainda precisam ser validadas em uma máquina Windows.

O build cruzado neste Linux produziu a pasta `release/win-unpacked`, mas não concluiu o instalador NSIS por falta de Wine. Gere o instalador em Windows ou use o workflow manual **Desktop packages** no GitHub Actions, depois de enviar estas alterações ao repositório. O workflow foi preparado, mas ainda não executado; ele guarda artefatos e não publica uma release.

### Desenvolvimento e empacotamento

Requer Node.js 22 ou posterior e npm. Quem usa o instalador não precisa instalar Node.js.

```sh
npm ci
npm run desktop
npm test
npm run test:desktop
npm run pack:linux
# Em Windows, para gerar o instalador nativo:
npm run pack:windows
```

O teste desktop usa um diretório temporário e verifica criação de tarefa, avanço do cronômetro e persistência após reiniciar o processo. Requer sessão gráfica. Em ambientes isolados que bloqueiam o sandbox do Chromium, `npm run test:desktop -- --no-sandbox` é uma alternativa apenas para esse teste descartável; não valida o sandbox ou a instalação no sistema final.

### Dados e limites desta entrega

- Histórico, tarefas, notas e preferências ficam em `workspace.sqlite`, na pasta `meu-espaco` dentro do diretório de dados do usuário: normalmente `~/.config/meu-espaco` no Linux e `%APPDATA%\meu-espaco` no Windows. O menu **Aplicativo → Abrir pasta dos dados** mostra o local exato.
- O banco usa SQLite com transações e WAL; ambientes personalizados continuam no IndexedDB do perfil Electron. Para copiar a pasta inteira como backup, feche o aplicativo antes.
- O aplicativo abre apenas uma instância. Minimizar mantém o cronômetro em execução; fechar encerra o processo. Uma sessão em execução continua sendo contabilizada pelo relógio até sua duração limite ao reabrir, como na versão de navegador. Não há alarme com o aplicativo fechado.
- Os dados do navegador não são transferidos automaticamente. A versão web de desenvolvimento continua disponível por `npm start` com armazenamento separado.
- O funcionamento básico não carrega fontes externas. Players e vídeos por URL continuam dependendo de internet e podem ter restrições de reprodução no Electron. A conexão Google Agenda fica oculta no desktop nesta etapa.
- Ainda há um único perfil local por usuário do sistema. Cadastro de perfis, importação de backups e sincronização não foram implementados nesta entrega. Os dados não são criptografados.
- Os artefatos ficam em `release/`, ignorada pelo Git. Nenhuma publicação ou instalação no sistema é feita pelos comandos de empacotamento.

Validação inicial: testes de lógica, áudio e persistência SQLite passaram; teste Electron de fechar/reabrir passou no Linux com perfil temporário e `--no-sandbox`, devido às restrições do ambiente de desenvolvimento. A instalação final com sandbox habilitado e o funcionamento em Windows ainda precisam de validação. O empacotador usa ícone padrão nesta etapa. A auditoria npm identificou seis avisos moderados na cadeia de desenvolvimento do `electron-builder` (dependência `minimatch`), sem dependências npm de produção; não foi aplicado downgrade automático do empacotador.

## Executar no navegador (desenvolvimento)

Requer Node.js 22 ou posterior. Não há dependências para instalar.

```sh
npm start
```

Abra **http://127.0.0.1:5173**. Use sempre a mesma origem e perfil do navegador para acessar seu histórico.

## Funcionalidades

- Pomodoro de 50 minutos, pausa curta de 10 e longa de 20, todos configuráveis. As etapas começam manualmente.
- Iniciar, pausar e reiniciar. O foco já realizado continua registrado mesmo ao reiniciar.
- Salas Estudos e Trabalho: trocar de sala durante uma sessão passa a contabilizar o próximo intervalo na nova sala.
- Tarefas diárias separadas por sala, com conclusão local.
- Notas rápidas compartilhadas entre salas: título e texto, salvamento automático local, busca por título/conteúdo, fixação, exclusão com desfazer enquanto a página permanece aberta e download em `.txt`. As notas também entram na exportação JSON.
- Estatísticas de dia, semana (segunda a domingo), mês e ano, com navegação entre períodos e filtro por sala. Somente foco entra no total.
- Mixer com volume geral, chuva binaural gravada, oceano/lareira sintetizados e tons estéreo Delta/Theta via Web Audio. Arquivos locais podem fornecer café, teclado ou outros sons.
- Player por URL para YouTube, Spotify e Apple Music. Disponibilidade, duração da reprodução e login dependem de cada serviço. O mixer controla apenas sons locais; cada player tem seu volume.
- Paisagem em tela cheia, imagens e vídeos locais ou vídeos por link.
- Painéis independentes e arrastáveis, com posições salvas; configuração do Pomodoro na própria janela.
- Modo foco que oculta as ferramentas após inatividade (5 segundos por padrão) e as mostra ao mover o mouse, tocar ou usar o teclado.
- Avisos do navegador e exportação do histórico em JSON.

O cronômetro usa o relógio, não a quantidade de ticks, e retoma o estado ao recarregar. Se fechar a aba com a sessão em execução, o tempo continua até o limite daquela sessão; o alarme só pode tocar com a página aberta. Pausar antes de fechar evita esse registro. Nenhuma pausa ou próxima sessão começa automaticamente. Uma trava impede duas abas de gravar simultaneamente.

Os dados ficam no `localStorage` deste navegador, sem sincronização. Limpar os dados do navegador apaga o histórico. A exportação permite guardar uma cópia; esta versão não possui importação de backup. O arquivo de imagem ou vídeo escolhido em Ambientes fica no IndexedDB deste navegador. Áudios personalizados valem apenas para a sessão atual.

A paisagem incluída é uma fotografia de [Anton Sobotyak no Unsplash](https://unsplash.com/photos/a-dirt-path-in-the-middle-of-a-forest-GJJdGDsoomU). Vídeos do YouTube usados como fundo são reproduzidos sem áudio; use Mídia para ouvir música.

## Google Agenda usado no Notion Calendar

O usuário confirmou que as atividades aparecem no Notion Calendar e pertencem à conta Google. A integração lê essa agenda diretamente. A API local do Notion Calendar abre eventos, mas não fornece uma listagem deles: [documentação](https://www.notion.com/en-gb/help/notion-calendar-connections).

Para autorizar o aplicativo local:

1. Crie ou selecione um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Calendar API**.
3. Configure a tela de consentimento OAuth. Se o aplicativo estiver em teste, inclua seu e-mail como usuário de teste.
4. Crie um **OAuth Client ID**, tipo **Web application**. Em origens JavaScript autorizadas, adicione `http://127.0.0.1:5173` (e `http://localhost:5173` somente se também usar esse endereço).
5. No Pomodoro, abra **Conectar agenda** e cole apenas o **Client ID público**, terminado em `.apps.googleusercontent.com`. Não use Client Secret ou senha.
6. Deixe o ID da agenda como `primary`, ou informe o ID encontrado em Google Agenda → Configurações da agenda → Integrar agenda.
7. Clique **Preparar conexão**, depois **Entrar com Google**, e autorize a leitura dos eventos.

A integração usa o escopo `calendar.events.readonly`, expande eventos recorrentes e pagina resultados. Tokens ficam somente em memória e são perdidos ao recarregar; será necessário entrar novamente. A configuração pública do cliente é lembrada. Não há alteração ou conclusão de eventos na conta Google: **+ Estudos/Trabalho** cria uma tarefa local a partir de um evento. A lista pode ser atualizada manualmente e ao mudar a data.

Referências: [Google Identity token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).

**Estado atual:** fluxo implementado, mas conexão real ainda não validada porque falta o Client ID e a autorização da conta do usuário.

## Validação

```sh
npm test
```

Testes da contagem de foco, troca de sala, exclusão de pausas, limites de período, sessões atravessando meia-noite e validação de URLs de mídia. A interface também foi exercitada em Chrome isolado em desktop e celular. Capturas de desenvolvimento ficam em `artifacts/` (ignoradas pelo Git).

## Estrutura

- `index.html`, `assets/`: base visual convertida com 12ui e imagens geradas, armazenadas localmente.
- `src/app.js`, `src/app.css`: interface funcional e responsiva.
- `src/workspace.js`, `src/workspace.css`: janelas móveis, ambientes e ocultação automática.
- `src/core.js`: cronômetro e agregação do histórico.
- `src/audio.js`: mixer de áudio sintetizado.
- `src/notes.js`: painel de notas com persistência local e busca.
- `src/calendar.js`: autorização Google e consulta somente de leitura.
- `server.mjs`: servidor vinculado apenas a `127.0.0.1`.

Não há publicação externa. O aplicativo usa internet para players, Google Agenda e fontes. O cronômetro, tarefas e sons sintetizados funcionam sem esses serviços.

## Branches

- `main`: versão de referência do projeto.
- `dev`: desenvolvimento e próximas alterações.

Prioridade atual: consolidar as ferramentas básicas — cronômetro, tarefas por sala, estatísticas, sons e persistência local. Vídeos e Google Agenda ficam fora do escopo desta etapa.

Revisão de 12/11/2026: fluxo de ajustar tempos, iniciar/pausar/reiniciar, concluir tarefas, trocar de sala e recarregar validado em Chrome isolado. Corrigidos o silenciamento durante operações do cronômetro e a aplicação dos volumes salvos ao iniciar uma sessão. Testes automatizados cobrem também a preservação do silêncio ao alterar volume e disparar o alarme.

Refinamento da interface: fonte nativa do sistema (SF nos dispositivos Apple), ícones vetoriais consistentes, estados de hover/pressionamento e cantos padronizados. Painéis abrem em 220 ms e fecham em 160 ms; esses tempos são escolhas do projeto, não valores prescritos pela Apple. O X oculta a ferramenta sem interromper o cronômetro ou os sons. Escape fecha o painel superior; diálogos também fecham ao clicar fora. O foco volta ao controle de origem e a preferência de movimento reduzido elimina as animações. Fechamento, cliques rápidos e movimento reduzido foram verificados em Chrome isolado, com inspeção visual em 1280 e 390 px.

Referências: Apple HIG — [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers) e [Materials](https://developer.apple.com/design/human-interface-guidelines/materials). A interface adapta esses princípios para a web; os painéis móveis são ferramentas persistentes, não popovers transitórios.

# Meu Espaço

Pomodoro pessoal inspirado nas funções do LifeAt. Aplicativo local, em português, com salas Estudos e Trabalho.

## Executar

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
- Estatísticas de dia, semana (segunda a domingo), mês e ano, com navegação entre períodos e filtro por sala. Somente foco entra no total.
- Mixer com volume geral, chuva, oceano, lareira e tons estéreo Delta/Theta sintetizados via Web Audio. Arquivos locais podem fornecer café, teclado ou outros sons.
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
- `src/calendar.js`: autorização Google e consulta somente de leitura.
- `server.mjs`: servidor vinculado apenas a `127.0.0.1`.

Não há publicação externa. O aplicativo usa internet para players, Google Agenda e fontes. O cronômetro, tarefas e sons sintetizados funcionam sem esses serviços.

## Branches

- `main`: versão de referência do projeto.
- `dev`: desenvolvimento e próximas alterações.

Pendências: validar reprodução de vídeos de fundo com arquivos reais e concluir a configuração/autorização da conta Google.

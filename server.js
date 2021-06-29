const UIDGenerator = require('uid-generator');

const tokenGen= new UIDGenerator();
const gameGen = new UIDGenerator(32,"ABCDEFGHIJKLMNOPQRSTUVWYZ");

const sockets = new Map();
const games = new Map();

const PORT = 8080;

const express = require("express")
const app = express()

app.use("/src",express.static(__dirname+"/src"))

app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/src/index.html")
})

const server = app.listen(PORT,()=>{
    console.log(`Server Started at ${PORT}`)
})

const WebSocket = require("ws");
const url = require("url")

const gameWs = new WebSocket.Server({ noServer: true });
const chatWs = new WebSocket.Server({ noServer: true });

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/gameWs') {
      gameWs.handleUpgrade(request, socket, head, function done(ws) {
        gameWs.emit('connection', ws, request);
      });
    } else if (pathname === '/chatWs') {//Not used
      chatWs.handleUpgrade(request, socket, head, function done(ws) {
        chatWs.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
});

/*
  Conection
 */
gameWs.addListener("connection",async (ws)=>{
    let token;
    do{//generate token until the token is not being used by an OPEN socket
        token = await tokenGen.generate()       
    }while(sockets.get(token)?.readyState < WebSocket.CLOSED)
    ws.onclose = (ce)=>{
        sockets.delete(token)//removes socket from memory if the connection is closed
        //todo purify (games)
    }
    sockets.set(token,ws)
    ws.onmessage = (me)=>gameProcess(me,ws);
    ws.send("TOKEN\r\n"+token)
})

chatWs.on('connection', function connection(ws) {
    ws.close(1013,"Chat Socket not suported")
});

/*
    Game logic
*/
async function gameProcess(me,errWs){//We don't use the errWs as ws even if errWs === ws and we don't use ws to identificate the player to prevent a CORS Attack 
    console.log(me.data)
    let data = me.data
    data = me.data.split("\r\n")
    let headers = data[0]
    data.shift();
    headers = headers.split(" ")
    let verb = headers[0]
    let socketToken = headers[1]
    let gameId = headers[2] || "not undefined"
    let ws = sockets.get(socketToken)
    let game = games.get(gameId)
    if(!socketToken)return errWs.close(4002);
    if(!ws)return errWs.close(4201);
    if(verb != "CREATE" && verb != "JOIN"){
        if(!game)return ws.close(4301,"Couldn't find game")
        if(ws?.gameId != gameId)return ws.close(4404,"The TOKEN doesn't match the game")
    }

    if(!/([A-Z]|[a-z]|[0-9]|_)/.test(me.data))return ws.close(4101,"Data contains unsuported character")

    switch(verb){
        case "CREATE":
            if(!data[0])return ws.close(4102,"Not enought data")
            if(ws.gameId)return ws.close(4405,"The user is already in a game")
            do{
                gameId = await gameGen.generate()
            }while(games.has(gameId))
            game = {
                names: new Map(),
                tokens: new Map(),
                owner:data
            }
            game.names.set(data[0],socketToken)
            game.tokens.set(socketToken,data[0])
            games.set(gameId,game)
            ws.gameId = gameId
            sockets.set(socketToken,ws)
            ws.send("CREATED\r\n"+gameId)
        break;
        case "JOIN":
            if(!data[0])
                return ws.close(4102,"Not enought data")
            if(!game)
                return ws.close(4301,"Couldn't find game");
            if(game.names.has(data[0]))
                return ws.close(4403,"This name is already being used");

            game.names.set([data[0],socketToken])
            game.tokens.set([socketToken,data[0]])
            games.set(gameId,game)
            ws.gameId = gameId
            sockets.set(socketToken,ws)
            ws.send("ACK")
        break;
        default:
            ws.close(4006,"Couldn't understand verb")
        break;
    }

}

/*
    Chat logic
*/





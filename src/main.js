const ws = new WebSocket("ws://"+window.location.host+"/gameWs")

var nameInput = document.getElementById("nameInput")
var gameIdInput = document.getElementById("gameInput")

var joinBTN = document.getElementById("joinBtn");
var createBTN = document.getElementById("createBtn");

var token;
var gameId;
ws.onopen = ()=>{
    joinBTN.onclick = ()=>{
        let name = nameInput.value
        gameId = gameIdInput.value
        ws.send(`JOIN ${token} ${gameId}\r\n${name}`)
    }
    createBTN.onclick = ()=>{
        let name = nameInput.value
        ws.send(`CREATE ${token}\r\n${name}`)
    }
    ws.onclose = (ce)=>{
        if(ce.code)
        alert("Error "+ce.code+" "+ce.reason)
    }
    ws.onmessage = (me)=>{
        let data = me.data.split("\r\n")
        console.log(me.data)
        switch(data[0]){
            case "TOKEN":
                token = data[1]
            break;
            case "CREATED":
                gameId = data[1]
                alert(token+"  "+gameId)
            break;
            case "ACK":
            break;
        }
    }
}
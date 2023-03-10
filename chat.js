// =======================================BAREBONES==============================================
function errHandler(err){
    console.log(err);
}


function sendMsg(peer){
    var text = message.value;
    if($.trim(text)!=''){

        // console.log("connections: " + connections[peer].peer)
        d = new Date()
        msg = {peer:User, type:'text',content:text, timestamp: d}
        MsgHtml(msg)

        //e.data = string type
        if(peer in connections){
            connections[peer]._chatChannel.send(JSON.stringify(msg))//might need to figure out a protocol for "user":"text"/"images"/"link"/etc
        }
        message.value="";
    }
    return false;
}

function MsgHtml(msg){
    var sender = "You"
    var timestamp = new Date(msg.timestamp).toLocaleTimeString('en-US').replace(/:\d+ /, ' ')
    if(msg.peer != User){
        sender = msg.peer;
    }
    chat.innerHTML += '<div class="ui comments"><div class="comment"><a class="ui avatar circular image"><img class="ui avatar image" src="pfpic.png"></a><div class="content"><a class="author">' +
            sender  + '</a><div class="metadata"><div class="date">' + timestamp +
            '</div></div><div class="text">'+ msg.content + '</div></div></div></div>'
    chat.scrollTo(0, chat.scrollHeight);
}


class Connection{
    constructor(){
        this.conf = {iceServers: [{urls: ["stun:stun.l.google.com:19302"]}]};
        this.pc = new RTCPeerConnection(this.conf);
        this.peer
        this.connected = false;
        this._chatChannel
        this.checker()

        
    }
    chatChannel(con,cc){

        this._chatChannel = cc
        this._chatChannel.onopen = function(e){
            console.log('chat channel is open',e);
            con._chatChannel = this
            this.send(User)
            localOfferSet()
        }
        this._chatChannel.onmessage = function(e){  //HAS ACCESS TO con
            var msg =  e.data
            if(con.connected == false){
                console.log('connected with user: ', msg)
                Users.push(msg)                     //MAYBE REMOVE
                connections[msg] = con;
                document.getElementById(msg).innerHTML += "<div class='ui teal label'>Online</div>"
                con.peer = msg
                con.connected = true
            }else{//MSG RECEIVE
                var msg = JSON.parse(e.data)
                //if user is in current chat then load ui to display msg
                console.log("message received")
                if(msg.peer == activePeer){
                    if(msg.type == "text"){
                        MsgHtml(msg)
                    }
                }
            }
        }
        this._chatChannel.onclose = function(){
            console.log('chat channel closed');
            console.log(con.peer + ' has logged off.')
            logoff(con.peer)
            con.connected = false
            delete connections[con.peer]
        }

    }
    checker(){
        var con = this
        this.pc.ondatachannel = function(e){
            if(e.channel.label == "chatChannel"){
                console.log('chatChannel Received -',e);
                con._chatChannel = e.channel
                con.chatChannel(con,con._chatChannel)            
            }
        }

        this.pc.onicecandidate = function(e){
            var cand = e.candidate;
            if(!cand){
                console.log('iceGatheringState complete');
                var off = this.localDescription
                if(mode == true){
                    answers.push(JSON.stringify(off));//OFFER STRINGIFY
                    datlen += 1;//increment through users needed to be answered
                    if(datlen == Users.length){
                        sendAnswers();
                    }else{
                        remoteOfferGot(offers[Users[datlen]]);
                    }
                }else{
                    sendOffer(off);
                    // mode = true;
                }
            }else{
                console.log(cand.candidate);
            }
        }

        this.pc.oniceconnectionstatechange = function(){
            console.log('iceconnectionstatechange: ',this.iceConnectionState);
            if(mode == true && this.iceConnectionState == 'connected' ){
                states += 1;
            }
            if(mode == false){
                if(Object.size(connections) == 0){
                    clearInterval(timer);
                }
                sendCheck();
            }
            if(this.iceConnectionState == 'disconnected'){
                if(con.connected == true){
                    console.log(con.peer + ' has logged off.')
                    logoff(con.peer)
                    delete connections[con.peer]
                }
            }
        }
        this.pc.onconnection = function(e){
            console.log('onconnection ',e);
        }
    }
}


function localOfferSet(){//CONVERSION WIP: SHOULD ONLY BE CALLED ON LOGIN(immediate w 0 users) AND REOFFER
    if(mode == true){
        //REPLACE HTML PLEASE!
        $('#list').addClass('visible')
        $('#replaceable').html('<div>Welcome to Peerify</div>')

        
        mode = false
        
    }
    var C = new Connection();
    tests.push(C)
    C._chatChannel = C.pc.createDataChannel('chatChannel');
    C.chatChannel(C,C._chatChannel)

    C.pc.createOffer().then(des=>{
        console.log('createOffer ok ');
        C.pc.setLocalDescription(des).then( ()=>{
            setTimeout(function(){
                if(C.pc.iceGatheringState == "complete"){
                    return;
                }else{
                    console.log('after GetherTimeout');
                    sendCheck();
                    localOffer.value = JSON.stringify(C.pc.localDescription);//wtf
                }
            },2000);
            console.log('setLocalDescription ok');
        }).catch(errHandler);
    }).catch(errHandler);
}


function remoteOfferGot(offer){
    var _remoteOffer = new RTCSessionDescription(offer);//ANSWER
    console.log('remoteOffer \n',_remoteOffer);
    if(tests.length == 0){
        C = new Connection()
    }else{
        C = tests[tests.length-1]
    }
    C.pc.setRemoteDescription(offer).then(function() {//THIS MIGHT BREAK THE CODE
            console.log('setRemoteDescription ok');
            if(_remoteOffer.type == "offer"){
                C.pc.createAnswer().then(function(description){
                    console.log('createAnswer 200 ok \n',description);
                    C.pc.setLocalDescription(description).then(function() {
                    }).catch(errHandler);                   
                }).catch(errHandler);               
            }
            else{
                console.log('ANSWER?')
            }
    }).catch(errHandler);
// return C
}


connections = new Set()//set containing data channels between peers
tests = []
//=========================================================AUTHENTIFICATION===========================================================
var url = "https://script.google.com/macros/s/AKfycbzc3YogTKYDV20gIz35wxu2fupij0MDy82SHbODit-ocuZVT1VI/exec"
var mode = true//true for answering : false for offering 
var datlen = 0
var states = 0//for how many connectionState's passed.
var Users = []
var offers = {}
var answers = [];
var User
var activeElement
var activePeer = ""
var timer
var chatmap
var userbase = []
$('.ui.accordion')
  .accordion()
;


function login(e) {
    var xhr = new XMLHttpRequest();
    var Username = document.getElementById('username');
    var Password = document.getElementById('password');
    var button = document.getElementById('btn');

    $(".loginput1, .loginput2").removeClass("error")

    Username.setAttribute("disabled",'') 
    Password.setAttribute("disabled",'')
    button.className = "large ui fluid disabled button";

    xhr.open('GET',  url + '?callback=ctrlq&Username='+Username.value+'&Password='+Password.value+'&action=login');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE &&
          xhr.status === 200) {
        var result = JSON.parse(e.target.response);
        if (result.result != "success") {
            if(result.result == "incorrect password"){
                $(".loginput2").addClass("error")
            }
            $(".loginput1").addClass("error")
            button.className = "large ui fluid teal button"
            Username.removeAttribute('disabled');
            Password.removeAttribute('disabled');
        }else{
            User = Username.value
            answer(result.data);
            // console.log(result.data)
            chatmap = JSON.parse(result.data.map)
            userbase = Array.from(result.data.userbase);//no need to JSON.parse because its list not obj.
            
            userbaseUI();
            $('#profilehead').html('<h2 class="ui teal header"><img src="pfpic.png" class="ui circular image">'+String(User)+'</h2>')
        }
        // console.log(result)
      }
    }
    xhr.send();
    
}
function reset(){//timer reset for (1) users
    var xhr = new XMLHttpRequest();
    xhr.open('GET',  url + '?callback=ctrlq&User='+ User +'&action=reset');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        var result = JSON.parse(e.target.response);
      }
    }
    xhr.send();
    timer = setInterval(function(){
        var xhr = new XMLHttpRequest();
        xhr.open('GET',  url + '?callback=ctrlq&User='+ User +'&action=reset');
        xhr.onreadystatechange = function(e) {
          if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            var result = JSON.parse(e.target.response);
          }
        }
        xhr.send();
    }, 10000) 
}


function logoff(user){
    $('#'+user).children().last().remove(); //REMOVE ONLINE TAG (change in the future to specifically target)
    var xhr = new XMLHttpRequest();
    xhr.open('GET',  url + '?callback=ctrlq&User='+ user +'&action=logoff');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        var result = JSON.parse(e.target.response);
        if(Object.size(connections) == 0){
            reset()
        }
      }
    }
    xhr.send();
}

function sendOffer(off){//WIP
    var xhr = new XMLHttpRequest();
    xhr.open('GET',  url + '?callback=ctrlq&User='+ User +'&Offer='+ encodeURIComponent(JSON.stringify(off))+'&action=offer');//
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE &&
          xhr.status === 200) {
        var result = JSON.parse(e.target.response);
      }
    }
    xhr.send();
}


function answer(data){
    // M.toast({html: 'Logging In...'})
    Users = data.users;//trying to answer these user's offers
    datlen = 0;
    for(var i = 0; i<Users.length; i++){
        if(data.offers[i] == ""){
            login()
        }else{
            offers[Users[i]] = JSON.parse(data.offers[i])
        }
    }
    if(Users.length != 0){
        remoteOfferGot(offers[Users[datlen]]);
    }else{
        console.log("no one on")
        reset()
        localOfferSet();
    }
}

function sendAnswers(){
    var xhr = new XMLHttpRequest();
    xhr.open('GET',  url + '?callback=ctrlq&Users='+JSON.stringify(Users)+'&Answers='+encodeURIComponent(JSON.stringify(answers))+'&action=answer');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        var result = JSON.parse(e.target.response);
      }
    }
    xhr.send();
}

function sendCheck(){
    var xhr = new XMLHttpRequest();
    xhr.open('GET',  url + '?callback=ctrlq&User='+User+'&action=check');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        var result = JSON.parse(e.target.response);
        if(result.data == ""){//TRY TO FIX THIS GS SIDE
            sendCheck()
        }else{
            remoteOfferGot(JSON.parse(result.data));
        }
      }
    }
    xhr.send();
}

function register(e){//STILL NEEDS TO BE FINISHED; BARE FUNCTIONS IMPLEMENTED. REQURIES: EMAIL FUNC, ENTER SUBMISSION, PARSING/RESTRICT
    var xhr = new XMLHttpRequest();
    var Username = document.getElementById('uname');
    var Password = document.getElementById('pword');
    xhr.open('GET',  url + '?callback=ctrlq&Username='+Username.value+'&Password='+Password.value+'&action=register');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        var result = JSON.parse(e.target.response);
        console.log(result)
      }
    }
    xhr.send();
}

function userbaseUI(){
    template = ''
    for(var i=0; i<userbase.length; i++){
        template += '<a class="item" id="' + String(userbase[i]) +'" onclick="selectPeer(this)"><img class="ui avatar image" src="pfpic.png"><span>'+userbase[i]+'</span></a>';
    }
    $.parseHTML(template)
    $('#list').append(template)
}

function chatlogUI(peerid){
    peername = String(peerid)
    activePeer = peername
    template = '<div id="chat"></div><form id="FORM" class="ui form footer" target="invisible" onsubmit="sendMsg(\''+peername+'\'); return false;" >'+
'                <div class="field">'+
'                    <div class="ui icon action input"><input id="message" type="text" name="Content" placeholder="Type a message..." autocomplete="off">'+
'                      <button type="submit" value="Submit" onclick="" class="ui teal button" autocomplete="off">Send<i class="right paper plane icon"></i></button></div></div></form>'
    $('#replaceable').html(template)
    var ht = $('#chat').height() - $('#FORM').height();
    $('#chat').css("height",ht+"px");
}

function selectPeer(peer){
    if(activeElement != peer){
        $(activeElement).removeClass("active light teal")
        chatlogUI(peer.id)
        $(peer).addClass("active light teal")
        activeElement = peer
    }
}


Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};



$(document).ready(function() {
  // Override the default dimmer page behaviour for Sidebar 
  $('.sidebar')
    .sidebar({
      dimPage: false,
      closable: false
    })
    .sidebar('setting', 'transition', 'push');
});

    // .sidebar('attach events', '#vk-header-icon-a')
function tsend(){//tester for form implementation
    console.log('ay')
}

$(window).resize(function(){
    if(activePeer != ""){
        var ht = $(window).height() - $('#FORM').height();
        $('#chat').css("height",ht+"px");
    }
});

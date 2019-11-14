

function sendMessage(){
	var f = document.getElementById("form");
	var m = document.getElementById("message").value;
	var n = document.getElementById("name").value;
	var s = '<div class="ui comments"><div class="comment"><a class="ui avatar circular image"><img class="ui avatar image" src="pfpic.png"></a><div class="content"><a class="author">' +
			 n + '</a><div class="metadata"><div class="date">' + "Just Now" + '</div></div><div class="text">'+ m + '</div></div></div></div>'
	container = document.getElementById("content")
	container.innerHTML += s;
	container.scrollTo(0,container.scrollHeight);
	setTimeout(function(){ f.reset(); }, 10);
}


function getChatLogs(e){
	var xhr = new XMLHttpRequest();
    xhr.open('GET', "https://script.google.com/macros/s/AKfycbzc3YogTKYDV20gIz35wxu2fupij0MDy82SHbODit-ocuZVT1VI/exec" + '?callback=""');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        var result = JSON.parse(e.target.response);
        buildHTML(result.data);
        if( result.data !== current){
        	getChatLogs(e);
        	current = result.data;
    	}
      }
    }
    xhr.send();
}


function buildHTML(data) {
    data.shift()
    var str = data.reduce(function(s, row,i){
      if (row[0] && row[1] && row[2]){
        s += '<div class="ui comments"><div class="comment"><a class="ui avatar circular image"><img class="ui avatar image" src="pfpic.png"></a><div class="content"><a class="author">' +
			 row[1] + '</a><div class="metadata"><div class="date">' + (new Date(row[0])).toLocaleTimeString('en-US').replace(/:\d+ /, ' ') + '</div></div><div class="text">'+ row[2] + '</div></div></div></div>';
      }
      return s;
    }, '')

    var container = document.getElementById("content");	
    if( data.length > container.childElementCount || first){
    	container.innerHTML = str;
	    container.scrollTo(0,container.scrollHeight);
		
    	first = false;
    }
}


$("form :input").attr("autocomplete", "off");
var current;
var first = true;
getChatLogs();

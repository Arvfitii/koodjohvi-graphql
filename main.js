let token = ""
let userId = 0

function onLoad(){
    token = getTokenCookie()
    if(token != "") getUserId();
}

function login() {
    let url = 'https://01.kood.tech/api/auth/signin';
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;;

    let http = new XMLHttpRequest();
    http.open('POST', url, true); // Replace the URL with your own
    http.setRequestHeader('Authorization', 'Basic ' + btoa(username + ":" + password));
    http.onreadystatechange = function () {//Call a function when the state changes.
        if (http.readyState == 4) {
            let res = JSON.parse(http.responseText);
            if (typeof res === 'string' || res instanceof String) {
                token = res
                document.cookie = "token="+res; 
                getUserId()
            } else {
                document.getElementById("loginError").innerHTML = res.error
            }
        }
    }
    http.send();
}


function getUserId() {
    let url = 'https://01.kood.tech/api/graphql-engine/v1/graphql';

    let http = new XMLHttpRequest();
    http.open('POST', url, true); // Replace the URL with your own
    http.setRequestHeader('Authorization', 'Bearer ' + token);
    http.onreadystatechange = function () {//Call a function when the state changes.
        if (http.readyState == 4) {
            let res = JSON.parse(http.responseText);
            userId = res.data.user[0].id
            getData()
        }
    }

    const data = JSON.stringify({
        query: `{
            user {
              id
            }
          }`,
    });

    http.send(data);
}

function getData() {
    let url = 'https://01.kood.tech/api/graphql-engine/v1/graphql';

    let http = new XMLHttpRequest();
    http.open('POST', url, true); // Replace the URL with your own
    http.setRequestHeader('Authorization', 'Bearer ' + token);
    http.onreadystatechange = function () {//Call a function when the state changes.
        if (http.readyState == 4) {
            let res = JSON.parse(http.responseText);
            document.getElementById("login").style.display = "none"
            document.getElementById("main").style.display = "block"
            displayData(res.data)
        }
    }

    const data = JSON.stringify({
        query: `{
      user {
        login
      }
      transaction{
        type
        amount
        eventId
        createdAt
      }
      event_user(where: { userId: { _eq: ${userId} }}){
        eventId
        event{
            path
            createdAt
            endAt
        }
      }
    }`,
    });

    http.send(data);
}


function displayData(data) {
    let eventId = 0
    let eventStart = 0
    for (i of data.event_user) {
        if (i.event.path.endsWith("div-01")) {
            eventId = i.eventId;
            eventStart = Date.parse(i.event.createdAt)
            break
        }
    }
    let xpChanges = []
    let auditChanges = []
    let xp = 0
    let auditUp = 0
    let auditDown = 0
    for (i of data.transaction) {
        if (i.eventId != eventId) continue;
        if (i.type == "xp") {
            xp += i.amount;
            xpChanges.push(i)
        } else if (i.type == "up") {
            auditUp += i.amount
            auditChanges.push(i)
        } else if (i.type == "down") {
            auditDown += i.amount
            auditChanges.push(i)
        }
    }
    document.getElementById("displayUser").innerHTML = data.user[0].login
    document.getElementById("xp").innerHTML = numberToBytes(xp)

    document.getElementById("auditrecieved").innerHTML = numberToBytes(auditDown)
    document.getElementById("auditdone").innerHTML = numberToBytes(auditUp)
    document.getElementById("auditratio").innerHTML = (auditUp / auditDown).toFixed(2)

    displayXpGraph(eventStart, xp, xpChanges)
    displayAuditGraph(eventStart, auditChanges)
}

function displayXpGraph(eventStart, xp, xpChanges) {
    xpChanges.sort((a,b) => {
        return Date.parse(a.createdAt) > Date.parse(b.createdAt);
    })
    let maxXp = xp*1.3;
    
    let end = Date.now()
    let sum = 0;
    let prevX = 24;
    let prevY = xpGraphHeight-24;
    
    var startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    startText.innerHTML = (new Date(eventStart).toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric"}))+" - 0B"
    startText.setAttribute("x", prevX)
    startText.setAttribute("y", xpGraphHeight-12)
    startText.setAttribute("text-anchor", "start")
    startText.setAttribute("fill", "#FFF8E3")
    document.getElementById("xpGraph").appendChild(startText)

    var endText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    endText.innerHTML = (new Date().toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric"}))+" - "+numberToBytes(xp)
    endText.setAttribute("x", xpGraphWidth-24)
    endText.setAttribute("y", 24)
    endText.setAttribute("text-anchor", "end")
    endText.setAttribute("fill", "#FFF8E3")
    document.getElementById("xpGraph").appendChild(endText)


    for (i of xpChanges) {
        let relativeX = (Date.parse(i.createdAt) - eventStart) / (end - eventStart);
        sum += i.amount;
        let relativeY = sum / maxXp;

        let newX =relativeX*xpGraphWidth+24;
        let newY =(1-relativeY)*xpGraphHeight-24;

        var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('id', 'line2');
        line1.setAttribute('x1', prevX);
        line1.setAttribute('y1', prevY);
        line1.setAttribute('x2', newX);
        line1.setAttribute('y2', prevY);
        line1.setAttribute("stroke", "#E6A4B4")
        document.getElementById("xpGraph").appendChild(line1)

        var line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('id', 'line2');
        line2.setAttribute('x1', newX);
        line2.setAttribute('y1', prevY);
        line2.setAttribute('x2', newX);
        line2.setAttribute('y2', newY);
        line2.setAttribute("stroke", "#E6A4B4")
        document.getElementById("xpGraph").appendChild(line2)

        prevX = newX;
        prevY = newY;
    }
    var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('id', 'line2');
    line1.setAttribute('x1', prevX);
    line1.setAttribute('y1', prevY);
    line1.setAttribute('x2', xpGraphWidth);
    line1.setAttribute('y2', prevY);
    line1.setAttribute("stroke", "#E6A4B4")
    document.getElementById("xpGraph").appendChild(line1)
    
}

function displayAuditGraph(eventStart, auditChanges) {
    let displayelement = document.getElementById("auditGraph")
    auditChanges.sort((a,b) => {
        return Date.parse(a.createdAt) > Date.parse(b.createdAt);
    })
    let maxRatio = 4;
    
    let end = Date.now()
    let upSum = 0;
    let downSum = 0
    let prevX = 24;
    let prevY = (1-1/maxRatio)*xpGraphHeight-24;
    
    var startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    startText.innerHTML = (new Date(eventStart).toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric"}))+" - 1"
    startText.setAttribute("x", 24)
    startText.setAttribute("y", 24)
    startText.setAttribute("text-anchor", "start")
    startText.setAttribute("fill", "#FFF8E3")
    displayelement.appendChild(startText)

    var midline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    midline.setAttribute('id', 'line2');
    midline.setAttribute('x1', 0);
    midline.setAttribute('y1', prevY);
    midline.setAttribute('x2', xpGraphWidth);
    midline.setAttribute('y2', prevY);
    midline.setAttribute("stroke", "#FFF8E3")
    midline.setAttribute("stroke-dasharray","5,5")
    displayelement.appendChild(midline)

    


    for (i of auditChanges) {
        let relativeX = (Date.parse(i.createdAt) - eventStart) / (end - eventStart);
        if(i.type == "up") upSum += i.amount;
        if(i.type == "down") downSum += i.amount;
        let relativeY = (upSum/downSum)/maxRatio;

        let newX =relativeX*xpGraphWidth+24;
        let newY =(1-relativeY)*xpGraphHeight-24;

        var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('id', 'line2');
        line1.setAttribute('x1', prevX);
        line1.setAttribute('y1', prevY);
        line1.setAttribute('x2', newX);
        line1.setAttribute('y2', prevY);
        line1.setAttribute("stroke", "#E6A4B4")
        displayelement.appendChild(line1)

        var line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('id', 'line2');
        line2.setAttribute('x1', newX);
        line2.setAttribute('y1', prevY);
        line2.setAttribute('x2', newX);
        line2.setAttribute('y2', newY);
        line2.setAttribute("stroke", "#E6A4B4")
        displayelement.appendChild(line2)

        prevX = newX;
        prevY = newY;
    }
    var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('id', 'line2');
    line1.setAttribute('x1', prevX);
    line1.setAttribute('y1', prevY);
    line1.setAttribute('x2', xpGraphWidth);
    line1.setAttribute('y2', prevY);
    line1.setAttribute("stroke", "#E6A4B4")
    displayelement.appendChild(line1)

    var endText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    endText.innerHTML = (new Date().toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric"}))+" - "+(upSum/downSum).toFixed(1)
    endText.setAttribute("x", xpGraphWidth-24)
    endText.setAttribute("y", 24)
    endText.setAttribute("text-anchor", "end")
    endText.setAttribute("fill", "#FFF8E3")
    displayelement.appendChild(endText)
    
}

const byteNameThingies = ["B", "kB", "mB", "gB", "tB", "there prolly shouldnt be this much, something went wrong"]


const xpGraphWidth = 480
const xpGraphHeight = 240
function numberToBytes(num) {
    let decimals = 2
    let divisions = 0;
    while (num >= 1000) {
        num /= 1000
        divisions++;
    }
    if(num >= 10) decimals--;
    if(num >= 100) decimals--;
    return num.toFixed(decimals).toString() + " " + byteNameThingies[divisions]
}

function getTokenCookie() {
  var cookiestring=RegExp("token=[^;]+").exec(document.cookie);
  return decodeURIComponent(!!cookiestring ? cookiestring.toString().replace(/^[^=]+./,"") : "");
}

function logOut(){
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    location.reload()
}
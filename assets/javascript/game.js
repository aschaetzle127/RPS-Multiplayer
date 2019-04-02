$(document).ready(function() {
var config = {
    apiKey: "AIzaSyCNJ_DPLP31sYDRbogZGtbT6_qO5xZL-mw",
    authDomain: "rps-multiplayer-cbf81.firebaseapp.com",
    databaseURL: "https://rps-multiplayer-cbf81.firebaseio.com",
    projectId: "rps-multiplayer-cbf81",
    storageBucket: "rps-multiplayer-cbf81.appspot.com",
    messagingSenderId: "1067881902570"
  };
  
  firebase.initializeApp(config);

    // Firebase variables
    var dBase = firebase.database();
    var playersRef = dBase.ref("/players");
    var chatRef = dBase.ref("/chat");
    var connectionRef = dBase.ref("/chat");

    //My global variables
    var playerName,
        player1LoggedIn = false,
        player2LoggedIn = false,
        playerNum,
        playerObject,
        player1Object = {
            name: "",
            choice: "",
            wins: 0,
            losses: 0
        },
        player2Object = {
            name: "",
            choice: "",
            wins: 0,
            losses: 0
        },
        resetId;

    //My functions 

    function errorHandler(error) {
        console.log("Error:", error.code);
    }

    function loginPending() {
        $("#pre-connection, .pre-login, .post-login, .selections").hide();
        $(".pre-login").show();
    }

    function showLoggedInScreen() {
        $(".pre-connection, .pre-login, .pending-login").hide();
        $(".post-login").show();

        if(playerNum == "1") {
            $(".p1-selections").show();
        } else {
            $(".p1-selections").show();
        }

        if (playerNum == "2") {
            $(".p2-selections").show();
        } else {
            $(".p2-selections").show();
        }
    }

    function showSelections() {
        $(".selections, .pending-selection, .selection-made").hide();
        $(".selection-reveal").show();
    }

    connectionRef.on("value", function(snap) {
        if(!snap.val() && playerNum) {
            dBase.ref("/players/" + playerNum).remove();
            playerNum = null;

            showLoginScreen();
        }
    }, errorHandler);

    function showLoginScreen() {
        $(".pre-connection, .pending-login, .post-login, .selections").hide();
        $(".pre-login").show();
    }

    //Chats on chats on chats

    chatRef.on("child_added", function(chatSnap) {
        let chatObj = chatSnap.val();
        let chatText = chatObj.text;
        let chatLogItem = $("<li>").attr("id", chatSnap.key);

        if (chatObj.userId == "system") {
            chatLogItem.addClass("system");
        } else if (chatObj.userId == playerNum) {
            chatLogItem.addClass("current-user");
        } else {
            chatLogItem.addClass("other-user");
        }

        if (chatObj.name) {
            chatText = "<strong>" + chatObj.name + ":</strong>" + chatText;
        }

        chatLogItem.html(chatText);

        $("#chat-log").append(chatLogItem);

        $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);
    }, errorHandler);

    chatRef.on("child_removed", function(chatSnap) {
        window["player" + childSnap.key + "Logged In"] = true;
        window["player" + childSnap.key + "Object"] = childSnap.val();
    }, errorHandler);

    //adding and removing players to game

    playersRef.on("child_added", function(childSnap) {
        window["player" + childSnap.key + "LoggedIn"] = true;
        window["player" + childSnap.key + "Object"] = childSnap.val();
    }, errorHandler);

    playersRef.on("child_changed", function (childSnap) {
        window["player" + childSnap.key + "Object"] = childSnap.val();

        updateStats();
    }, errorHandler);

    playersRef.on("child_removed", function(childSnap) {
        chatRef.push({
            userId: "system",
            text: childSnap.val().name + " has disconnected"
        });

        window["player" + childSnap.key + "LoggedIn"] = false;
        window["player" + childSnap.key + "Object"] = {
            name: "",
            choice: "",
            wins: 0,
            losses: 0,
        };

        if(!player1LoggedIn && !player2LoggedIn) {
            chatRef.remove();
        }
    }, errorHandler);

    //let's play the game - the game play logic

    playersRef.on("value", function(snap) {
        $("#player-1").text(player1Object.name || "Waiting for Player 1");
        $("player-2").text(player2Object.name || "Waiting for Player 2");

        updatePlayerBox("1", snap.child("1").exists(), snap.child("1").exists() && snap.child("1").val().choice);
        updatePlayerBox("2", snap.child("2").exists(), snap.child("2").exists() && snap.child("2").val().choice);

        if (player1LoggedIn && player2LoggedIn && !playerNum) {
            loginPending();
        } else if (playerNum) {
            showLoggedInScreen();
        } else {
            showLoginScreen();
        }

        if (player1Object.choice && player2Object.choice) {
            rps(player1Object.choice, player2Object.choice);
        }
    }, errorHandler);

    $("#login").click(function(e) {
        e.preventDefault();

        if (!player1LoggedIn) {
            playerNum = "1";
            playerObject = player1Object;
        } else if (!player2LoggedIn) {
            playerNum = "2";
            playerObject = player2Object;
        } else {
            playerNum = null;
            playerObject = null;
        }

        if (playerNum) {
            playerName = $("#player-name").val().trim();
            playerObject.name = playerName;
            $("#player-name").val("");

            $("#player-name-display").text(playerName);
            $("#player-number").text(playerNum);

            dBase.ref("/players/" + playerNum).set(playerObject);
            dBase.ref("/players/" + playerNum).onDisconnect().remove();
        }
    });

    $(".selection").click(function () {
        if (!playerNum) return;

        playerObject.choice = this.id;
        dBase.ref("/players/" + playerNum).set(playerObject);

        $(".p" + playerNum + "-selctions").hide();
        $(".p" + playerNum + "-selections-reveal").text(this.id).show();
    });

    $("#send-chat").click(function (e) {
        e.preventDefault();

        chatRef.push({
            userId: playerNum,
            name: playerName,
            text: $("#chat").val().trim()
        });
        $("#chat").val("");
    });

    /**
    * @param {string=} p1choice rock, paper, scissors
    * @param {string=} p2choice rock, paper, scissors
    */
    
    function rps(p1choice, p2choice) {
        $(".p1-selection-reveal").text(p1choice);
        $(".p2-selection-reveal").text(p2choice);

        showSelections();

        if(p1choice === p2choice) {
            $("#feedback").text("It's a Tie!");
        } else if((p1choice == "rock" && p2choice == "scissors") || (p1choice == "paper" && p2choice == "rock" || (p1choice == "scissors" && p2choice == "paper"))) {
            $("#feedback").html("<small>" + p1choice + " beats " + p2choice + "</small><br/><br/>" + player1Object.name + " wins!!");

            if (playerNum == "1") {
                playerObject.wins++;
            } else {
                playerObject.losses++;
            }
        } else {
            $("#feedback").html("<small>" + p2choice + " beats " + p1choice + "</small><br/><br/>" + player2Object.name + " wins!!");

            if (playerNum == "2") {
                playerObject.wins++;
            } else {
                playerObject.losses++;
            }
        }
        
        resetId = setTimeout(reset, 3000);
    }

    function reset() {
        clearTimeout(resetId);

        playerObject.choice = "";

        dBase.ref("/players/" + playerNum).set(playerObject);

        $(".selection-reveal").hide();
        $("#feedback").empty();
    }

    function updateStats() {
        ["1", "2"].forEach(playerNum => {
            var obj = window["player" + playerNum + "Object"];
           // $("#p" + playerNum + "-wins").text(obj.wins);
            //$("#p" + playerNum + "-losses").text(obj.losses);
        });

        player1LoggedIn ? $(".p1-stats").show() : $(".p1-stats").hide();
        player2LoggedIn ? $(".p2-stats").show() : $(".p2-stats").hide();
    }

    /**
     * @param {string} playerNumber 1 or 2
     * @param {boolean} exists
     * @param {boolean} choice
     */

     function updatePlayerBox(playerNumber, exists, choice) {
         if (exists) {
             if (playerNum != playerNumber) {
                 if (choice) {
                     $(".p" + playerNumber + "-selection-made").show();
                     $(".p" + playerNumber + "-pending-selection").hide();
                 } else {
                    $(".p" + playerNumber + "-selection-made").hide();
                    $(".p" + playerNumber + "-pending-selection").show();
                 }
             }
         } else {
             $(".p" + playerNumber + "-selection-made").hide();
             $(".p" + playerNumber + "-pending-selection").hide();
         }
     }
    
});
// ==UserScript==
// @name         Tahribat Arkadaş Listesi
// @namespace    https://www.tahribat.com
// @version      0.2.1
// @description  Online Kişileri ve Arkadaşlarınızı Görmek ve Kısayoldan PM atmak içindir.
// @author       pSkpt
// @homepage     https://www.tahribat.com/Members/pSkpt?ref=39260
// @icon         https://www.tahribat.com/favicon.ico
// @supportURL   https://www.tahribat.com/PM?to=pSkpt
// @match        *://www.tahribat.com/*
// @require      https://raw.githubusercontent.com/sonerb/Tahribat-Friend-List-Extension/master/js/jquery.min.js
// @require      https://raw.githubusercontent.com/sonerb/Tahribat-Friend-List-Extension/master/js/jquery.slimscroll.min.js
// @require      https://raw.githubusercontent.com/sonerb/Tahribat-Friend-List-Extension/master/js/js.cookie.js
// @resource     customCSS https://raw.githubusercontent.com/sonerb/Tahribat-Friend-List-Extension/master/css/chatbox.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==
/* jshint -W097 */

console.log('yükendi.');

var newCSS = GM_getResourceText("customCSS");
GM_addStyle(newCSS);

var database;

function timeDifference(current, previous) {
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var elapsed = current - previous;
    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' saniye önce';
    } else if (elapsed < (msPerHour - msPerMinute)) {
        var saniye = (Math.round(elapsed / 1000) - (Math.round(elapsed / msPerMinute) * 60));
        var saniye_yaz = '';
        if (saniye > 0) {
            saniye_yaz = saniye + ' saniye önce';
        }
        return Math.round(elapsed / msPerMinute) + ' dakika ' + saniye_yaz;
    } else if (elapsed < (msPerDay - msPerHour)) {
        var dakika = (Math.round(elapsed / msPerMinute) - (Math.round(elapsed / msPerHour) * 60));
        var dakika_yaz = '';
        if (dakika > 0) {
            dakika_yaz = dakika + ' dakika önce';
        }
        return Math.round(elapsed / msPerHour) + ' saat ' + dakika_yaz;
    } else {
        return 'Yaklaşık ' + Math.round(elapsed / msPerDay) + ' days ago';
    }
}

var Database = function() {
    var mydb = false;
};

Database.prototype.initDB = function() {
    try {
        if (!window.openDatabase) {
            console.log('not supported');
        } else {
            var shortName = 'tbtOnlineFriends';
            var version = '1.0';
            var displayName = 'Tahribat Online Friends Database';
            var maxSize = 2 * 1024 * 1024;
            this.mydb = window.openDatabase(shortName, version, displayName, maxSize);
        }
    } catch (e) {
        console.log(e);
    }
};

Database.prototype.createTable = function() {
    try {
        this.mydb.transaction(
            function(transaction) {
                transaction.executeSql("CREATE TABLE IF NOT EXISTS friends (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, username VARCHAR(50) UNIQUE, lastseen TIMESTAMP, device INT(1) );", [], this.nullDataHandler, this.errorHandler);
            });
    } catch (e) {
        console.log(e);
    }
};

Database.prototype.createTable2 = function() {
    try {
        this.mydb.transaction(
            function(tx) {
                tx.executeSql("CREATE TABLE IF NOT EXISTS my_friends (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, username VARCHAR(50) UNIQUE);", [], this.nullDataHandler, this.errorHandler);
            });
    } catch (e) {
        console.log(e);
    }
};

Database.prototype.errorHandler = function(transaction, error) {
    window.alert("Error processing SQL: " + error);
    return true;
};

Database.prototype.nullDataHandler = function(transaction, results) {
    console.log(results);
};

Database.prototype.saveMultiData = function(user_data) {
    try {
        this.mydb.transaction(
            function(tx) {

                for (var key in user_data) {
                    tx.executeSql("INSERT OR IGNORE INTO friends (username, lastseen, device) VALUES (?,?,?)", [key, user_data[key][0], user_data[key][1]]);
                    tx.executeSql("UPDATE friends SET lastseen = ?, device = ? WHERE username = ?", [user_data[key][0], user_data[key][1], key]);
                }

            });
    } catch (e) {
        window.alert("Error processing SQL: " + e.message);
        return;
    }
};

Database.prototype.checkFriend = function(username) {
    try {
        this.mydb.transaction(
            function(tx) {
                tx.executeSql("SELECT * FROM my_friends WHERE lower(username) = ?", [username.toLowerCase()], function(transaction, results) {
                    if (results.rows.length > 0) {
                        $('#chat-remove-friend').show();
                        $('#chat-add-friend').hide();
                    } else {
                        $('#chat-remove-friend').hide();
                        $('#chat-add-friend').show();
                    }
                });
            });
    } catch (e) {
        window.alert(e.message);
    }
};

Database.prototype.addFriend = function(username) {
    try {
        $("div#chat_loading_div").show();
        this.mydb.transaction(
            function(tx) {
                tx.executeSql("INSERT OR IGNORE INTO my_friends (username) VALUES (?)", [username], function(tx, result) {
                    $("div#chat_loading_div").hide();
                });
            });

    } catch (e) {
        window.alert("Error processing SQL: " + e.message);
        return;
    }
};

Database.prototype.removeFriend = function(username) {
    try {
        $("div#chat_loading_div").show();
        this.mydb.transaction(
            function(tx) {
                tx.executeSql("DELETE FROM my_friends WHERE lower(username) = ?", [username.toLowerCase()], function(tx, result) {
                    $("div#chat_loading_div").hide();
                });
            });
    } catch (e) {
        window.alert("Error processing SQL: " + e.message);
        return;
    }
};

Database.prototype.loadFriends = function() {
    var saat = 1000 * 3600;
    var dakika = 1000 * 60;
    $("ul#chat-list").html('');
    try {
        this.mydb.transaction(
            function(tx) {
                tx.executeSql("SELECT m_f.username, f.lastseen, f.device FROM my_friends as m_f LEFT JOIN friends as f ON f.username = m_f.username ORDER BY lastseen DESC", [], function(tx, results) {
                    $("ul#chat-list").html('');
                    for (var i = 0; i < results.rows.length; i++) {
                        var row = results.rows.item(i);
                        var suan = new Date().getTime();
                        var lastseen = null;
                        if (row.lastseen)
                            lastseen = row.lastseen;

                        var relative_time = 'Bilinmiyor';
                        var span_style = 'gray';
                        var device_span = '';

                        if (lastseen) {
                            if (parseInt((suan - row.lastseen) / dakika) <= 10) {
                                span_style = 'green';
                            } else if (parseInt((suan - lastseen) / dakika) <= 30) {
                                span_style = 'yellow';
                            } else if (parseInt((suan - lastseen) / dakika) <= 60) {
                                span_style = 'red';
                            } else {
                                span_style = 'gray';
                            }

                            relative_time = timeDifference(suan, lastseen);
                        }

                        if (row.device != null) {
                            if (row.device == 0) {
                                device_span = '<span class="mobile"></span>';
                            }
                        }

                        $("ul#chat-list").append('<li title="' + relative_time + '"><span class="' + span_style + '"></span><a href="http://www.tahribat.com/Members/' + row.username + '/">' + row.username + '</a> '+device_span+'</li>');
                        $('div#chat-box-list label').text('Online (' + $('ul#chat-list span.green').length + ')');
                    }
                });
            });
    } catch (e) {
        window.alert(e.message);
    }

};

Database.prototype.loadData = function() {
    var saat = 1000 * 3600;
    var dakika = 1000 * 60;
    var simdi = new Date().getTime();
    $("ul#chat-list").html('');
    try {
        this.mydb.transaction(
            function(tx) {
                tx.executeSql("SELECT * FROM friends WHERE lastseen > ? ORDER BY lastseen DESC", [(simdi - saat)], function(tx, results) {
                    $("ul#chat-list").html('');
                    for (var i = 0; i < results.rows.length; i++) {
                        var row = results.rows.item(i);
                        var suan = new Date().getTime();
                        var span_style = 'gray';
                        var device_span = '';

                        if (parseInt((suan - row.lastseen) / dakika) <= 10) {
                            span_style = 'green';
                        } else if (parseInt((suan - row.lastseen) / dakika) <= 30) {
                            span_style = 'yellow';
                        } else if (parseInt((suan - row.lastseen) / dakika) <= 60) {
                            span_style = 'red';
                        } else {
                            span_style = 'gray';
                        }

                        if (row.device == 0) {
                            device_span = '<span class="mobile"></span>';
                        }

                        var relative_time = timeDifference(suan, row.lastseen);

                        $("ul#chat-list").append('<li title="' + relative_time + '"><span class="' + span_style + '"></span><a href="http://www.tahribat.com/Members/' + row.username + '/">' + row.username + '</a></li>');
                        $('div#chat-box-list label').text('Online (' + $('ul#chat-list span.green').length + ')');
                    }
                });
            });
    } catch (e) {
        alert(e.message);
    }
};

function main() {
    $.ajax({
        type: "GET",
        url: "https://www.tahribat.com/ActiveUsers",
        dataType: "HTML",
        success: function(data) {
            var user_data = {};
            $(data).find('table#ActiveUsersTable tr.userm').each(function(index) {
                var username = $(this).find('td:first a').text();
                var zaman = $(this).find('td:nth-child(3)').text();
                var nerden = $(this).find('td:nth-child(5) span').text();
                var arac = 0;

                if (nerden == 'Android' || nerden == 'Iphone') {
                    arac = 0;
                } else {
                    arac = 1;
                }

                var timestamp = new Date().getTime();
                var saat = 1000 * 3600;
                var dakika = 1000 * 60;
                var saniye = 1000;

                var ek_zaman = 0; 
                var zaman_bol = [];

                if (zaman === 'Şimdi') {
                    ek_zaman = 0;
                } else if (zaman.indexOf(',') > -1) {
                    zaman_bol = zaman.split(',');
                    var zaman_bol_saat = zaman_bol[0].split(' ')[0];
                    var zaman_bol_dk = zaman_bol[1].trim().split(' ')[0];

                    ek_zaman = (zaman_bol_saat * saat) + (zaman_bol_dk * dakika);

                } else {
                    zaman_bol = zaman.split(' ');
                    if (zaman_bol[1] === 'saat') {
                        ek_zaman = zaman_bol[0] * saat;
                    } else if (zaman_bol[1] === 'dakika') {
                        ek_zaman = zaman_bol[0] * dakika;
                    } else {
                        ek_zaman = zaman_bol[0] * saniye;
                    }
                }

                user_data[username] = [(timestamp - ek_zaman), arac];
            });

            database.saveMultiData(user_data);

            if ($('#chat-list').data('liste') == 2) {
                database.loadFriends();
            } else {
                database.loadData();
            }
        }
    });

}

$(document).ready(function() {

    database = new Database();
    database.initDB();
    database.createTable();

    if (document.location.pathname.substr(0, 8) == '/Members') {
        $('div.panel-content:first').prepend('<p class="clear" id="chat-add-friend">'+
                                             '<a href="#"><span class="imgbundle icon-add-friend"></span>Arkadaş Olarak Ekle</a>'+
                                             '</p>'+
                                             '<p class="clear" id="chat-remove-friend">'+
                                             '<a href="#">'+
                                             '<span class="imgbundle icon-remove-friend"></span>Arkadaşlıktan Çıkart'+
                                             '</a>'+
                                             '</p>');
        var username = document.location.pathname.split('/')[2];

        database.createTable2();
        database.checkFriend(username);

        $('#chat-add-friend').on('click', 'a', function(event) {
            event.preventDefault();
            database.addFriend(username);
            $(this).parent().hide();
            $('#chat-remove-friend').show();
        });

        $('#chat-remove-friend').on('click', 'a', function(event) {
            event.preventDefault();
            database.removeFriend(username);
            $(this).parent().hide();
            $('#chat-add-friend').show();
        });

    }

    $(window).on("scroll", function(event) {
        if ($("body").scrollTop() == 0) {
            $("div#chat_loading_div").css('margin-top', '30px');
        } else {
            $("div#chat_loading_div").css('margin-top', '0px');
        }
    });

    $('body').append('<div style="position:fixed;width:70px; top:0; right: 0; display:none;" id="chat_loading_div"><img src="https://raw.githubusercontent.com/sonerb/Tahribat-Friend-List-Extension/master/images/loading.gif" /></div>');

    if ($("body").scrollTop() == 0) {
        $("div#chat_loading_div").css('margin-top', '30px');
    } else {
        $("div#chat_loading_div").css('margin-top', '0px');
    }

    $("body").append('<div class="chat-box" id="chat-box-list">'+
                     '<input type="checkbox" />'+
                     '<label></label>'+
                     '<div class="chat-box-content">'+
                     '<div class="chat-tabs-parent">'+
                     '<span class="chat-tab" id="c_all">Hepsi</span> <span class="chat-tab" id="c_friends">Arkadaşlarım</span> <span class="chat-tab" id="c_search">Ara</span>'+
                     '<input type="text" id="chat-search">'+
                     '</div>'+
                     '<ul id="chat-list" data-liste="1"></ul>'+
                     '</div>'+
                     '</div>');

    $("body").append('<div class="chat-box" id="chat-box-sendMsg">'+
                     '<div class="chat-karart"></div>'+
                     '<div class="chat-info"></div>'+
                     '<input type="checkbox" />'+
                     '<label></label>'+
                     '<span class="chat-close"></span>'+
                     '<div class="chat-box-content">'+
                     'Kime : <a href="#" target="_blank"><span id="msg-kime"></span></a><br>'+
                     'Konu : <input type="text" name="msg-konu" id="msg-konu"><br>'+
                     'Mesaj : <textarea name="msg-msg" id="msg-msg"></textarea><br>'+
                     '<input type="button" value="Gönder" class="button blue">'+
                     '</div>'+
                     '</div>');

    $('#chat-box-list .chat-box-content ul').slimScroll({
        height: '250px'
    });

    $("#chat-search").on('keyup', function(event) {
        var value = $(this).val().toLowerCase();
        if (value == '') {
            $("#chat-list > li").show();
            return;
        }

        $("#chat-list > li").each(function() {
            if ($(this).text().toLowerCase().search(value) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

    });

    $('#c_search').on('click', function(event) {
        $("#chat-search").toggle(200);
    });

    $('#c_friends').on('click', function(event) {
        database.loadFriends();
        $("#chat-list").data('liste', 2);
        Cookies.set('chat_liste', 2);
    });

    $('#c_all').on('click', function(event) {
        database.loadData();
        $("#chat-list").data('liste', 1);
        Cookies.set('chat_liste', 1);
    });

    if (Cookies.get('chat_liste') == 2) {
        $("#chat-list").data('liste', 2);
        database.loadFriends();
    } else {
        $("#chat-list").data('liste', 1);
        database.loadData();
    }


    $('#chat-box-list').on('click', 'ul li a', function(event) {
        event.preventDefault();
        $("#chat-box-sendMsg").show();
        $("#chat-box-sendMsg input[type='checkbox']").prop("checked", true);
        $("#chat-box-sendMsg .chat-box-content").show();
        $("#chat-box-sendMsg .chat-box-content span#msg-kime").text($(this).text());
        $("#chat-box-sendMsg .chat-box-content span#msg-kime").parent().attr('href', 'https://www.tahribat.com/Members/' + $(this).text() + '/');
        $("#chat-box-sendMsg label").text($(this).text() + " Kullanıcısına Mesaj Gönder");
    });

    $('#chat-box-sendMsg').on('click', 'span.chat-close', function(event) {
        event.preventDefault();
        $("#chat-box-sendMsg").hide();
        $("#chat-box-sendMsg input[type='checkbox']").prop("checked", false);
        $("#chat-box-sendMsg .chat-box-content").hide();
    });

    $('#chat-box-sendMsg').on('click', 'input[type="button"]', function(event) {

        var user = $('span#msg-kime').text().trim();
        var konu = $('input#msg-konu').val().trim();
        var mesaj = $('textarea#msg-msg').val().trim();

        if (konu.length > 0 && mesaj.length > 0 && user.length > 0) {

            $("div.chat-karart").slideDown(300);
            $("div.chat-info").slideDown(300);
            $("div.chat-info").text('Mesaj Gönderiliyor...');

            $("div#chat_loading_div").show();
            $.ajax({
                type: "GET",
                url: "https://www.tahribat.com/PM?to=" + user,
                success: function(data) {
                    var parser = new DOMParser();
                    var resp = parser.parseFromString(data, "text/html");
                    token = resp.getElementsByName('__RequestVerificationToken')[0].value;
                    $.ajax({
                        type: "POST",
                        url: "https://www.tahribat.com/Pm",
                        data: "__RequestVerificationToken=" + token + "&Username=" + user + "&subject=" + konu + "&message=" + mesaj + "&cmd=NewPm",
                        success: function(data) {
                            $('input#msg-konu').val('');
                            $('textarea#msg-msg').val('');
                            $("div.chat-info").text('Mesaj Gönderildi');
                            $("div.chat-karart").slideUp(800);
                            $("div.chat-info").slideUp(800);
                            $("div#chat_loading_div").hide();
                        }
                    });
                }
            });

        }
    });

    main();

    setInterval(function() {
        main();
    }, 60000);

});
// Takeout MAP with everyone Licence: MIT
"use strict";

// Global Variable
var map, gl, hash, glot;        // leaflet系(map, gl, hash) 翻訳(glot)
var LL = {}, Conf = {}          // latlng,Config

// consts
const MoreZoomMsg = "ズームすると店舗が表示されます。";
const OvGetError = "サーバーからのデータ取得に失敗しました。やり直してください。";
// const OvServer = 'https://overpass.kumi.systems/api/interpreter' // or 'https://overpass-api.de/api/interpreter' or 'https://overpass.nchc.org.tw/api/interpreter'
const OvServer = 'https://overpass.nchc.org.tw/api/interpreter'
const LANG = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0, 2) == "ja" ? "ja" : "en";
const FILES = ['modals.html', 'data/category-' + LANG + '.json', 'data/datatables-' + LANG + '.json', 'data/local.json'];

$(document).ready(function () {

    console.log("Welcome to Takeaway.");

    // Load Conf file
    let jqXHRs = [];
    for (let key in FILES) { jqXHRs.push($.get(FILES[key])) };
    $.when.apply($, jqXHRs).always(function () {
        // initialize variable
        $("#Modals").html(arguments[0][0]);
        for (let idx = 1; idx <= 3; idx++) {
            let arg = arguments[idx][0];
            Object.keys(arg).forEach(key1 => {
                Conf[key1] = {};
                Object.keys(arg[key1]).forEach((key2) => Conf[key1][key2] = arg[key1][key2]);
            });
        };
        DisplayStatus.window_resize();      // Set Window Size
        DisplayStatus.splash(true);         // Splash Screen
        DisplayStatus.make_menu();          // Menu
        DataList.init();

        // initialize leaflet
        console.log("initialize leaflet.");
        map = L.map('mapid', { center: Conf.local.DefaultCenter, zoom: Conf.local.DefaultZoom, maxZoom: 21 });
        gl = L.mapboxGL({ container: 'map', attribution: Conf.local.attribution, accessToken: 'no-token', style: Conf.local.style }).addTo(map);
        map.zoomControl.setPosition("bottomright");
        L.control.locate({ position: 'bottomright', locateOptions: { maxZoom: 16 } }).addTo(map);
        L.control.scale({ imperial: false, maxWidth: 200 }).addTo(map);

        // translation
        console.log("initialize translation.");
        glot = new Glottologist();
        glot.import("./data/glot.json").then(() => { glot.render() });

        // 引数を元にマップの初期状態を設定
        if (location.hash == "") {      // 緯度経度が無い場合
            hash = new L.Hash(map);
            Takeaway.event_move();
        } else {
            hash = new L.Hash(map);
        };

        // イベント登録
        $(window).resize(DisplayStatus.window_resize);      // 画面サイズに合わせたコンテンツ表示切り替え
        map.on('moveend', Takeaway.event_move);               // マップ移動時の処理
        map.on('zoomend', function (e) {                    // ズーム時のメッセージ表示
            let msg = map.getZoom() < Conf.local.IconViewZoom ? MoreZoomMsg : "";
            DisplayStatus.morezoom(msg);
        });

        // スタイル不足時のエラー回避
        map.on('styleimagemissing', function (e) {
            var id = e.id,
                prefix = 'square-rgb-';
            if (id.indexOf(prefix) !== 0) return;
            var rgb = id.replace(prefix, '').split(',').map(Number);
            var width = 1,
                bytesPerPixel = 1;
            var data = new Uint8Array(width * width * bytesPerPixel);
            for (var x = 0; x < width; x++) {
                for (var y = 0; y < width; y++) {
                    var offset = (y * width + x) * bytesPerPixel;
                    data[offset + 0] = rgb[0]; // red
                    data[offset + 1] = rgb[1]; // green
                    data[offset + 2] = rgb[2]; // blue
                    data[offset + 3] = 0; // alpha
                }
            }
            map.addImage(id, { width: width, height: width, data: data });
        });
    });
});

var Takeaway = (function () {

    var _status = "initialize";
    const YESNO = ["yes", "no"]; // outseetタグ用

    return {
        status: () => { return _status }, // ステータスを返す
        get: function (keys, callback) { // 情報（アイコンなど）を地図に追加
            console.log("Takeaway: get start...");
            _status = "get";
            var targets = [];
            if (keys == undefined || keys == "") {
                for (let key in Conf.target) targets.push(key);
            } else {
                targets = keys;
            };
            if (map.getZoom() < Conf.local.IconViewZoom) {
                console.log("Takeaway: get end(Conf.local.IconViewZoom).");
                Takeaway.update();
                callback();
            } else {
                OvPassCnt.get(targets).then(ovanswer => {
                    PoiCont.set(ovanswer);
                    Takeaway.update();
                    console.log("Takeaway: get end.");
                    callback();
                }).catch((jqXHR, statusText, errorThrown) => {
                    console.log("Takeaway: get Error. " + statusText);
                    Takeaway.update();
                    callback();
                });
            }
        },

        // Update Takeout Map Icon
        update: targetkey => {
            let ZoomLevel = map.getZoom();
            if (targetkey == "" || typeof (targetkey) == "undefined") { // no targetkey then update all layer
                for (let target in Conf.target) {
                    Marker.all_delete(target);
                    if (Conf.target[target].zoom <= ZoomLevel) Marker.set(target);
                }
            } else {
                Marker.all_delete(targetkey);
                if (Conf.target[targetkey].zoom <= ZoomLevel) Marker.set(targetkey);
            }
            _status = "";
        },

        view: osmid => {
            _status = "view";
            DataList.select(osmid);
            let poi = PoiCont.get_osmid(osmid);
            let tags = poi.geojson.properties;
            let date = moment(tags.timestamp);
            osmid = osmid.replace('/', "=");
            history.replaceState('', '', location.pathname + "?" + osmid + location.hash);

            $("#osmid").html(tags.id);
            $("#timestamp").html(date.format("YYYY/MM/DD hh:mm"));
            $("#name").html(tags.name == null ? "-" : tags.name);
            $("#category-icon").attr("src", tags.takeaway_icon);
            $("#category").html(PoiCont.get_catname(tags));

            // opening_hours
            let openhour;
            if (tags["opening_hours:covid19"] != null) {
                openhour = tags["opening_hours:covid19"];
            } else {
                openhour = tags.opening_hours == null ? "-" : tags.opening_hours;
            };
            let RegexPTN = [[/\|\|/g, "<br>"], [/;/g, "<br>"]];
            Object.keys(Conf.opening_hours).forEach(key => {
                RegexPTN.push([new RegExp(key, "g"),Conf.opening_hours[key]]);
            });
            RegexPTN.forEach(val => { openhour = openhour.replace(val[0], val[1]) });
            if (tags["opening_hours:covid19"] != null) { openhour += Conf.category.suffix_covid19 }
            $("#opening_hours").html(openhour);

            // cuisine
            let cuisine = [];
            if (tags.cuisine != null) {
                cuisine = tags.cuisine.split(";").map(key => {
                    return Conf.category.cuisine[key] || key;
                });
            };

            // cuisine(diet)
            let diet = Object.keys(Conf.category.diet).map(key => {
                if (tags[key] != null) {
                    if (tags[key] !== "no") return Conf.category.diet[key] || key;
                }
            });
            cuisine = cuisine.concat(diet);
            cuisine = cuisine.filter(Boolean);
            cuisine = cuisine.join(', ');
            $("#cuisine").html(cuisine == "" ? "-" : cuisine);

            let outseet = YESNO.indexOf(tags.outdoor_seating) < 0 ? "" : tags.outdoor_seating;
            if (outseet !== "") {
                $("#outdoor_seating").attr("glot-model", "outdoor_seating_" + outseet);
            } else {
                $("#outdoor_seating").removeAttr("glot-model");
            };

            // takeout
            let takeaway;
            if (tags["takeaway:covid19"] != null) {
                takeaway = Conf.category.takeaway[tags["takeaway:covid19"]];
                takeaway = takeaway == undefined ? "?" : takeaway + Conf.category.suffix_covid19;
            } else {
                takeaway = tags.takeaway == null ? "-" : Conf.category.takeaway[tags.takeaway];
                takeaway = takeaway == undefined ? "?" : takeaway;
            }
            $("#takeaway").html(takeaway);

            // delivery
            let delname;
            if (tags["delivery:covid19"] != null) {
                delname = Conf.category.delivery[tags["delivery:covid19"]];
                delname = delname == undefined ? "?" : delname + Conf.category.suffix_covid19;
            } else {
                delname = tags.delivery == null ? "-" : Conf.category.delivery[tags.delivery];
                delname = delname == undefined ? "?" : delname;
            }
            $("#delivery").html(delname);

            $("#phone").attr('href', tags.phone == null ? "" : "tel:" + tags.phone);
            $("#phone_view").html(tags.phone == null ? "-" : tags.phone);

            let fld = {};
            fld.website = tags["contact:website"] == null ? tags["website"] : tags["contact:website"];
            fld.sns_instagram = tags["contact:instagram"] == null ? tags["instagram"] : tags["contact:instagram"];
            fld.sns_twitter = tags["contact:twitter"] == null ? tags["twitter"] : tags["contact:twitter"];
            fld.sns_facebook = tags["contact:facebook"] == null ? tags["facebook"] : tags["contact:facebook"];
            Object.keys(fld).forEach(key => {
                if (fld[key] == null) {
                    $("#" + key).hide();
                } else {
                    $("#" + key).show();
                };
            });

            $("#description").html(tags.description == null ? "-" : tags.description.trim());

            glot.render();
            $('#PoiView_Modal').modal({ backdrop: 'static', keyboard: true });

            let hidden = e => {
                _status = "";
                history.replaceState('', '', location.pathname + location.hash);
                $('#PoiView_Modal').modal('hide');
            };
            $('#PoiView_Modal').one('hidePrevented.bs.modal', hidden);
            $('#PoiView_Modal').one('hidden.bs.modal', hidden);
        },
        event_move: (e) => {                // map.moveend発生時のイベント
            console.log("moveend: event start.");
            LL.NW = map.getBounds().getNorthWest();
            LL.SE = map.getBounds().getSouthEast();
            let targets = Object.keys(Conf.target).filter(key => { return Conf.target[key].list });

            if (LL.busy) clearTimeout(LL.id);    // no break and cancel old timer.

            LL.busy = true;
            if (Takeaway.status() == "initialize") {    // 初期イベント(移動)
                Takeaway.get("", () => {
                    DataList.view(targets);
                    DisplayStatus.splash(false);
                    if (location.search !== "") {    // 引数がある場合
                        let osmid = location.search.replace(/[?&]fbclid.*/, '');    // facebook対策
                        osmid = osmid.replace('-', '/').replace('=', '/').slice(1);
                        let tags = PoiCont.get_osmid(osmid).geojson.properties;
                        if (tags !== undefined) Takeaway.view(tags.id);
                    }
                    LL.busy = false;
                });
            } else {
                LL.id = setTimeout(() => {
                    Takeaway.get("", () => { DataList.view(targets) });
                    LL.busy = false;
                }, 1000);
            }
        },
        openmap: osmid => {
            let poi = PoiCont.get_osmid(osmid);
            let tags = poi.geojson.properties;
            let ll = poi.latlng;
            let name = tags.name == undefined ? "" : "search/" + tags.name + "/";
            window.open('https://www.google.com/maps/' + name + "@" + ll.lat + ',' + ll.lng + ',' + map.getZoom() + 'z');
        },

        opensite: (osmid, key) => {
            let tags = PoiCont.get_osmid(osmid).geojson.properties;
            let address = tags["contact:" + key] == undefined ? tags[key] : tags["contact:" + key];
            let http = address.substr(0, 4) == "http" ? true : false;
            switch (key) {
                case "website":
                case "facebook":
                    if (!http) address = "https://" + address;
                    break;
                case "twitter":
                    if (!http) address = "https://twitter.com/" + address;
                    break;
                case "instagram":
                    if (!http) address = "https://www.instagram.com/" + address;
                    break;
            }
            if (address !== "") window.open(address);
        },

        sharemap: () => {
            execCopy(location.href);
            $("#copyTarget").remove();
            $('#copied').one('animationend', () => $('#copied').removeClass('copied'));
            $('#copied').addClass('copied');
        }
    }
})();

function execCopy(string) {
    // ClipBord Copy
    let pre = document.createElement('pre');
    pre.style.webkitUserSelect = 'auto';
    pre.style.userSelect = 'auto';

    let text = document.createElement("div");
    text.appendChild(pre).textContent = string;
    text.style.position = 'fixed';
    text.style.right = '200%';
    document.body.appendChild(text);
    document.getSelection().selectAllChildren(text);
    let copy = document.execCommand("copy");
    document.body.removeChild(text);
    return copy;
}

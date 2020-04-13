// Takeout MAP with everyone Licence: MIT
"use strict";

// Global Variable
var map, gl, hash, glot;    // leaflet系(map, gl, hash) 翻訳(glot)
var PoiData = {};           // {key: {geojson,marker}}
var LL = {};                // latlng
var Conf = {}               // Download Config
var DataList_Targets = [];  // リストに表示する対象物

// consts
const MoreZoomMsg = "ズームすると店舗が表示されます。";
const OvGetError = "サーバーからのデータ取得に失敗しました。やり直してください。";
// const OvServer = 'https://overpass.kumi.systems/api/interpreter' // or 'https://overpass-api.de/api/interpreter' or 'https://overpass.nchc.org.tw/api/interpreter'
const OvServer = 'https://overpass.nchc.org.tw/api/interpreter'
const FILES = ['modals.html', 'data/category-ja.json', 'data/datatables-ja.json', 'data/local.json'];
const OverPass = {
    TAK: ['node["takeaway"!="no"]["takeaway"]', 'way["takeaway"!="no"]["takeaway"]'],
    DEL: ['node["delivery"!="no"]["delivery"]', 'way["delivery"!="no"]["delivery"]'],
    DEF: ['node["shop"="bakery"]', 'way["shop"="bakery"]'],
    VND: ['node["amenity"="vending_machine"]["vending"="drinks"]'],
    LIB: ['node["amenity"="library"]', 'way["amenity"="library"]'],
};

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
        DataList_Targets = Object.keys(Conf.target).filter(key => {
            PoiData[key] = {};
            return Conf.target[key].list;
        });

        DisplayStatus.window_resize();      // Set Window Size
        DisplayStatus.splash(true);         // Splash Screen
        DisplayStatus.make_menu();          // Menu
        DataList.init();

        // initialize leaflet
        console.log("initialize leaflet.");
        map = L.map('mapid', { center: Conf.local.DefaultCenter, zoom: Conf.local.DefaultZoom, maxZoom: 20 });
        gl = L.mapboxGL({ container: 'map', attribution: Conf.local.attribution, accessToken: 'no-token', style: Conf.local.style }).addTo(map);
        map.zoomControl.setPosition("bottomright");
        L.control.locate({ position: 'bottomright', strings: { title: "現在地を表示" }, locateOptions: { maxZoom: 16 } }).addTo(map);
        L.control.scale({ imperial: false, maxWidth: 200 }).addTo(map);

        // translation
        glot = new Glottologist();
        glot.import("./data/glot.json").then(() => { glot.render() });

        // 引数を元にマップの初期状態を設定
        if (location.hash == "") {      // 緯度経度が無い場合
            hash = new L.Hash(map);
            Marker.event_move();
        } else {
            hash = new L.Hash(map);
        };

        // イベント登録
        $(window).resize(DisplayStatus.window_resize);      // 画面サイズに合わせたコンテンツ表示切り替え
        map.on('moveend', Marker.event_move);               // マップ移動時の処理
        map.on('zoomend', function (e) {                    // ズーム時のメッセージ表示
            let msg = map.getZoom() < Conf.local.MinZoomLevel ? MoreZoomMsg : "";
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
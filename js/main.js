/*global Ext:false */
/*global $:false */
/*global OpenLayers:false */
/*global GeoExt:false */
/*global mygeocloud_ol:false */
/*global attributeForm:false */
/*global geocloud:false */
/*global gc2i18n:false */

Ext.Ajax.withCredentials = true;

var App = new Ext.App({}), screenName, subUser, schema, cloud, gc2, layer, grid, store, map, viewport,
    drawControl, gridPanel, modifyControl, tree, layerBeingEditing, saveStrategy, getMetaData, qstore = [],
    tbar, createLayer, offline = false, typeStore,
    session, localStoreKey, host = "", initExtent = null;

typeStore = new Ext.data.JsonStore({
    fields: ['name', 'value'],
    data: [
        {
            name: 't_5710_born_skole_dis',
            value: 't_5710_born_skole_dis'
        }
    ]
});

$(document).ready(function () {
    'use strict';
    var currentActiveIndex, cards, logIn, logOut, upload,
        navHandler, cardSwitch, setState;

    setState = function () {
        if (session) {
            Ext.getCmp("loginBtn").setDisabled(true);
            Ext.getCmp("logoutBtn").setDisabled(false);
            Ext.getCmp("uploadBtn").setDisabled(false);
            tbar.getComponent(0).setText((offline ? "Offline" : "Online") + " > " + (subUser ? subUser + "@" : "") + screenName + (schema ? " > " + schema : ""));
        } else {
            Ext.getCmp("loginBtn").setDisabled(false);
            Ext.getCmp("logoutBtn").setDisabled(true);
            Ext.getCmp("uploadBtn").setDisabled(true);
            tbar.getComponent(0).setText("Log ind");
        }
    };

    logOut = function () {
        $.ajax({
            url: '/api/v1/session/stop',
            dataType: 'json',
            success: function (response) {
                console.log(response);
                screenName = null;
                subUser = null;
                session = false;
                setState();
            }
        });
    };

    logIn = function () {
        offline = false;
        if (Ext.getCmp("loginForm").form.isValid()) {
            Ext.getCmp("loginForm").form.submit({
                url: '/api/v1/session/start',
                success: function (e, a) {
                    screenName = Ext.decode(a.response.responseText).screen_name;
                    subUser = Ext.decode(a.response.responseText).subuser;
                    session = true;
                    setState();
                },
                failure: function () {
                    alert("Could not log in. Check user name and password.");
                }
            });
        }
    };

    upload = function () {
        var win = new Ext.Window({
            title: ('Upload'),
            id: "upload_win",
            layout: 'fit',
            modal: true,
            width: 750,
            height: 390,
            closeAction: 'close',
            resizable: false,
            border: false,
            plain: true,
            scope: this,
            items: [new Ext.Panel({
                id: "addform",
                frame: false,
                bodyStyle: 'padding: 0',
                border: false,
                //layout: "fit",
                html: "<div id='shape_uploader'>" + "You need Flash or a modern browser, which supports HTML5" + "</div>",
                afterRender: function () {
                    var arr = [],
                        ext = ["shp", "tab", "geojson", "gml", "kml", "kmz", "mif", "zip", "rar", "dwg", "dgn", "dxf", "csv"],
                        geoType, encoding, fkgName, ignoreErrors, overwrite, append, _delete, srs, flag = false;
                    $("#shape_uploader").pluploadQueue({
                        runtimes: 'html5',
                        url: '/controllers/upload/vector',
                        max_file_size: '2000mb',
                        chunk_size: '1mb',
                        unique_names: true,
                        urlstream_upload: true,
                        init: {
                            UploadComplete: function (up, files) {
                                var count = 0, errors = [], i;
                                (function iter() {
                                    var e = arr[count], strings = [];
                                    if (arr.length === count) {
                                        if (flag) {
                                            App.setAlert(App.STATUS_NOTICE, "Filer behandlet");
                                            if (errors.length > 0) {
                                                for (i = 0; i < errors.length; i = i + 1) {
                                                    strings.push(errors[i]);
                                                }
                                                var message = "<textarea border='0' rows='15' cols='68'>" + strings.join("\n") + "</textarea>";
                                                Ext.MessageBox.show({
                                                    title: 'Fejl',
                                                    msg: message,
                                                    buttons: Ext.MessageBox.OK,
                                                    width: 800,
                                                    height: 600
                                                });
                                                Ext.getCmp('upload_win').close();

                                            }
                                        }
                                        return;
                                    } else {
                                        // spinner(true, "processing " + e.split(".")[0]);
                                        //geoType = (e.split(".").reverse()[0].toLowerCase() === "shp") ? "PROMOTE_TO_MULTI" : geoType;
                                        flag = true;
                                        $.ajax({
                                            url: '/controllers/upload/processfkg',
                                            data: "&file=" + e + "&name=" + e.split(".")[0] + "&fkgname=" + fkgName + "&encoding=" + encoding,
                                            dataType: 'json',
                                            type: 'GET',
                                            success: function (response) {
                                                count = count + 1;
                                                if (!response.success) {
                                                    errors.push(response.message);
                                                }
                                                iter();
                                                var message = "<textarea border='0' rows='15' cols='68'>Opdatere id'er:\n" + response.fkg_report.updated_ids.join("\n") + "\n\nIndsatte nye id'er:\n" + response.fkg_report.inserted_ids.join("\n") +  "</textarea>";
                                                Ext.MessageBox.show({
                                                    title: 'Succes',
                                                    msg: message,
                                                    buttons: Ext.MessageBox.OK,
                                                    width: 800,
                                                    height: 600
                                                });

                                                Ext.getCmp('upload_win').close();
                                            },
                                            error: function (response) {
                                                count = count + 1;
                                                errors.push(Ext.decode(response.responseText).message);
                                                iter();
                                                Ext.getCmp('upload_win').close();
                                            }
                                        });
                                    }
                                }());
                                if (!flag) {
                                    Ext.MessageBox.alert('Failure', "No files you uploaded seems to be recognized as a valid vector format.");
                                }
                            },
                            FilesAdded: function (up, files) {
                                Ext.each(files, function (item) {
                                    //console.log(item.name);
                                    Ext.each(ext, function (e) {
                                        if (item.name.split(".").reverse()[0].toLowerCase() === e) {
                                            arr.push(item.name);
                                        }
                                    });
                                });
                            },
                            BeforeUpload: function (up, file) {
                                encoding = Ext.getCmp('encoding').getValue();
                                fkgName = Ext.getCmp('fkgname').getValue();
                                up.settings.multipart_params = {
                                    name: file.name
                                };
                            }
                        }
                    });
                    window.setTimeout(function () {
                        var e = $(".plupload_droptext");
                        e.html("Træk filer ind her")
                        window.setTimeout(function () {
                            e.fadeOut(500).fadeIn(500);
                        }, 500);
                        window.setTimeout(function () {
                            e.html("Undestøttede formater" + ": " + ".shp .geojson .gml .kml .tab .mif .gdb*" + "<br><br>" + "Du kan også uploade datasæt komprimeret med zip eller rar.<br><br>* FileGDB folderen skal være komprimeret med enten zip eller rar.");
                        }, 1000);
                    }, 200);
                },
                tbar: [
                    'Type',
                    {
                        width: 200,
                        xtype: 'combo',
                        mode: 'local',
                        triggerAction: 'all',
                        forceSelection: true,
                        editable: false,
                        id: 'fkgname',
                        displayField: 'name',
                        valueField: 'value',
                        value: 't_5710_born_skole_dis',
                        allowBlank: false,
                        store: typeStore
                    },
                    ' ',
                    'Kodning',
                    {
                        width: 150,
                        xtype: 'combo',
                        mode: 'local',
                        triggerAction: 'all',
                        forceSelection: true,
                        editable: false,
                        id: 'encoding',
                        displayField: 'name',
                        valueField: 'value',
                        value: "UTF8",
                        allowBlank: false,
                        store: new Ext.data.JsonStore({
                            fields: ['name', 'value'],
                            data: [
                                {name: "LATIN1", value: "LATIN1"},
                                {name: "UTF8", value: "UTF8"}

                            ]
                        })
                    }
                ]
            })]
        }).show(this);
    };

    navHandler = function (direction) {
        var w = Ext.getCmp('cards');
        var activeIndex = w.items.indexOf(w.getLayout().activeItem) + direction;
        cards.setActiveItem(activeIndex);
    };

    cardSwitch = function () {
        var w = Ext.getCmp('cards');
        var activeIndex = w.items.indexOf(w.getLayout().activeItem);
        var mp = Ext.getCmp("move-prev");
        var mn = Ext.getCmp("move-next");
        switch (activeIndex) {
            case 0:
                mp.disable();
                mn.enable();
                mp.setText("");
                mn.setText("Upload >");
                break;
            case 1:
                mp.enable();
                if (session) {
                    mn.enable();
                } else {
                    mn.disable();
                }
                mp.setText("< Login");
                mn.setText("");
                break;

        }
    };

    viewport = new Ext.Viewport({
        layout: 'border',
        listeners: {
            afterlayout: function () {
                cards = Ext.getCmp("cards").layout;
            }
        },
        items: [
            {
                region: "center",
                layout: "fit",
                border: false,
                items: [
                    new Ext.Panel({
                        layout: "card",
                        id: "cards",
                        deferredRender: true,
                        activeItem: 0,
                        listeners: {
                            afterlayout: function () {
                                tbar = Ext.getCmp("cards").getTopToolbar();
                            },
                            resize: function () {
                                var w = Ext.getCmp('cards');
                                currentActiveIndex = w.items.indexOf(w.getLayout().activeItem);
                            }
                        },
                        tbar: [
                            {
                                xtype: 'tbtext',
                                text: ' '
                            }
                        ],
                        bbar: [
                            {
                                id: 'move-prev',
                                text: 'Back',
                                handler: navHandler.createDelegate(this, [-1])
                            },
                            '->',
                            {
                                id: 'move-next',
                                text: 'Next',
                                handler: navHandler.createDelegate(this, [1])

                            }
                        ],
                        items: [

                            new Ext.Panel({
                                listeners: {
                                    activate: function (e) {
                                        cardSwitch();
                                    }
                                },
                                border: false,
                                items: [
                                    {
                                        xtype: "form",
                                        id: 'loginForm',
                                        border: false,
                                        labelWidth: 90,
                                        bodyStyle: {
                                            padding: "10px"
                                        },

                                        keys: [{key: Ext.EventObject.ENTER, fn: logIn}],

                                        items: [
                                            {
                                                xtype: 'textfield',
                                                name: 'u',
                                                emptyText: 'Name',
                                                fieldLabel: 'Bruger',
                                                allowBlank: false,
                                                id: "userField"
                                            }, {
                                                xtype: 'textfield',
                                                inputType: 'password',
                                                name: 'p',
                                                emptyText: 'Password',
                                                fieldLabel: 'Password'

                                            }, {
                                                xtype: 'hidden',
                                                name: 's',
                                                value: "public"

                                            }
                                        ],
                                        buttonAlign: "left",
                                        buttons: [
                                            {
                                                id: "loginBtn",
                                                text: 'Log ind',
                                                handler: logIn
                                            }, {
                                                id: "uploadBtn",
                                                text: 'Upload filer',
                                                handler: upload,
                                                disabled: true
                                            }, {
                                                id: "logoutBtn",
                                                text: 'Log ud',
                                                handler: logOut,
                                                disabled: true
                                            }
                                        ]
                                    }
                                ]
                            }),

                            new Ext.Panel({
                                id: "upload filer   ",
                                region: "center",
                                border: false,
                                listeners: {
                                    activate: function (e) {
                                        cardSwitch();
                                    },
                                    click: {
                                        fn: function (e) {
                                            cards.setActiveItem(1);
                                            setState();
                                        },
                                        scope: this
                                    }
                                },
                                items: []
                            })


                        ]
                    })
                ]
            }
        ]
    });


    $.ajax({
        url: '/api/v1/session',
        dataType: 'json',
        success: function (response) {
            console.log(response);
            if (response.data.session) {
                screenName = response.data.db;
                subUser = response.data.subuser;
                session = true;
            }
            setState();
        }
    });
});


function array_unique(ar) {
    "use strict";
    var sorter = {}, out = [];
    if (ar.length && typeof ar !== 'string') {
        for (var i = 0, j = ar.length; i < j; i++) {
            if (!sorter[ar[i] + typeof ar[i]]) {
                out.push(ar[i]);
                sorter[ar[i] + typeof ar[i]] = true;
            }
        }
    }
    return out || ar;
}



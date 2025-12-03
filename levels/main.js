$.loadPlugin(class extends JSQuery.Plugin {
    Element() {
        return {
            showModal() {
                this.elt.showModal();
            },
            close() {
                this.elt.close()
            },
            contains(v) {
                return this.elt.contains(v.elt);
            },
        }
    }
})

function removeid(layer, value) {
    for(let x = 0; x < 14; x++) {
        for(let y = 0; y<14;y++) {
            if(layer[x][y] === value) {
                layer[x][y] = null;
            }
        }
    }
}

function flat_layer(layer) {
    const flat = [];
    for (let y = 0; y < layer[0].length; y++) { 
        for (let x = 0; x < layer.length; x++) {
            const tile = layer[x][y];
            if (tile) {
                flat.push(`Some(\\"${tile}\\")`);
            } else {
                flat.push("None")
            }
        }
    }
    return "[" + flat.join(",") + "]";
}

const scale = 1000/600;

function level_to_ron(level) {
    let ron = "[";

    ron+=`({\\"Tiles\\":(tiles:${flat_layer(level.layer2)})},Two),`;

    ron+=`({\\"Tiles\\":(tiles:${flat_layer(level.layer1)})},One),`;

    ron+=`({\\"Tiles\\":(tiles:${flat_layer(level.layer3)})},Three),`;

    for(const e of level.entities) {
        const prefab = levels.entity_presets[e.id];
        let pos = "";
        if(prefab.has_pos) {
            pos = `pos: (x: ${e.pos.x*scale}, y: ${e.pos.y*scale}),`
        }
        let fields = "";
        for(const [k, v] of Object.entries(e.fields)) {
            const type = levels.entity_presets[e.id].fields[k].type;
            switch(type) {
                case "text": {
                    fields+=`${k}: \\"${v}\\"` 
                }
                    break;
                case "number": {
                    fields+=`${k}: ${v}` 
                }
                case "checkbox": {
                    fields+=`${k}: ${v}` 
                }
                    break;
            }
        }

        const l = {
            player: "Player",
            entity: "Entity",
            ui: "UI",
            bg: "EntityBG",
        }
        ron += `({\\"${prefab.name}\\":(${pos}${fields})},${l[prefab.layer]}),`
    }
    if(levels.debug) {
        ron+=`({\\"FPS\\": ()},UI),`
    }

    ron+="]"
    return `("${ron}", "${level.bg.slice(0,7)}")`;
}

function to_ron() {
    let ron = ""
    for(const [k, v] of Object.entries(levels.levels)) {
        ron += `"${k}": ${level_to_ron(v)},`
    }
    return `(levels:{${ron}})`
}

document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});
/**
    * @import * from "p5/global"
    */

//width and height of each tile
const w = 600/14;
const h = 600/14;

//width and height of each pixel when rendering to the canvas
const pw = w/16;
const ph = h/16;

/**
    * @type{FileSystemDirectoryHandle}
    */
    let handle; 

let done;
$("#open").click(async () => {
    handle = await window.showDirectoryPicker({
        mode: "readwrite"
    });
    done();
    $("#open").remove();
});

function get_entity() {
    return new Promise((r) => {
        $("#entity-modal").showModal();
        function click() {
            r(true);
            $("#entity-ok").removeEvent("click", click)
            $("#entity-modal").removeEvent("close", close)
            $("#entity-modal").close();
        }
        function close() {
            r(false);
            $("#entity-ok").removeEvent("click", click)
            $("#entity-modal").removeEvent("close", close)
            $("#entity-modal").close();
        }
        $("#entity-ok").click(click)
        $("#entity-modal").on("close", close);
    })
}

$("#add-field").click(() => {
    const v = $.create("div").child([
        $.create("input").props({type: "text"}).class("key"),
        $.create("select").class("type").child([
            $.create("option").value("text").text("text"),
            $.create("option").value("number").text("number"),
            $.create("option").value("checkbox").text("bool"),
        ]),
        $.create("input").class("field-default").css({
            placeholder: "default"
        }),
        $.create("button").text("x").css({
            background: "red"
        }).click(() => {
            v.remove(); 
        })
    ])
    $("#entity-fields").child(v)
})

$("#add-entity").click(async () => {
    $("#entity-textures").value("");
    $("#struct-name").value("");
    $("#has-pos").checked(false);
    $("#entity-layer").value("player");
    $("#entity-fields").html("");
    if(!await get_entity()) {
        return;
    }
    const value = $("#entity-textures").value();
    const fields = {};
    for(const c of $("#entity-fields").children) {
        fields[c.$(".key").value()] = {
            type: c.$(".type").value(),
            default: c.$(".field-default").value(),
        }
    }
    const obj = {
        editor_texture: value,
        name: $("#struct-name").value(),
        has_pos: $("#has-pos").checked(),
        layer: $("#entity-layer").value(),
        fields,
    }
    const id = crypto.randomUUID();
    levels.entity_presets[id] = obj
    const t = $.create("button").html(makeSVG(images[value])).child(
        $.create("button").text("x").css({
            background: "red"
        }).click(()=> {
            t.remove();
            requestAnimationFrame(() => {
                select_tile($("#entity-presets").children.at(-1))
                if(!levels.levels[$("#levels-select").value()]) return;
                delete levels.entity_presets[id];
                for(const level of Object.values(levels.levels)) {
                    level.entities = level.entities.filter(v => v.id !== id)
                }
            })
        })
    ).value(id);
    $("#entity-presets").child(t); 
    t.click(() => {
        select_tile(t);
    })
    select_tile(t);
})

function get_tile() {
    return new Promise((r) => {
        $("#modal").showModal();
        function click() {
            r(true);
            $("#ok").removeEvent("click", click)
            $("#modal").removeEvent("close", close)
            $("#modal").close();
        }
        function close() {
            r(false);
            $("#ok").removeEvent("click", click)
            $("#modal").removeEvent("close", close)
            $("#modal").close();
        }
        $("#ok").click(click)
        $("#modal").on("close", close);
    })
}

function select_tile(v) {
    $("#tile-presets").children.removeClass("selected");
    $("#entity-presets").children.removeClass("selected")
    v?.class("selected");
    if(v) {
        if($("#entity-presets").contains(v)) {
            const id = v.value();
            const preset = levels.entity_presets[id]
            $("#fields").html("");
            for(const [k, v] of Object.entries(preset.fields)) {
                $("#fields").child($.create("div").value(k).child([
                    $.create("label").text(k + ": "),
                    $.create("input").props({type: v.type}).class("value").value(v.default),
                ])) 
            }
        }
    }
}

$("#add-tile").click(async () => {
    $("#tile-textures").value("");
    if(!await get_tile()) {
        return;
    }
    const value = $("#tile-textures").value();
    levels.tile_presets.push(value)
    const t = $.create("button").html(makeSVG(images[value])).child(
        $.create("button").text("x").css({
            background: "red"
        }).click(()=> {
            t.remove();
            requestAnimationFrame(() => {
                select_tile($("#tile-presets").children.at(-1))
                if(!levels.levels[$("#levels-select").value()]) return;
                levels.tile_presets = levels.tile_presets.filter(v=>v !== value);
                for(const level of Object.values(levels.levels)) {
                    removeid(level.layer1, value)
                    removeid(level.layer2, value)
                    removeid(level.layer3, value)
                }
            })
        })
    ).value(value);
    $("#tile-presets").child(t); 
    t.click(() => {
        select_tile(t);
    })
    select_tile(t);
})

$("#save").click(async () => {
    const file = await handle.getFileHandle("levels.proj")
    const f = await file.createWritable();
    await f.write(JSON.stringify(levels));
    await f.close();
    {
        const file = await handle.getFileHandle("levels.ron")
        const f = await file.createWritable();
        await f.write(to_ron());
        await f.close();
    }
    alert("its now safe to close the window")
})

function makeSVG(v) {
    let svg = "<svg width=\"64\" height=\"64\" shape-rendering=\"crispEdges\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:64px;height:64px;\">"
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const color = v[x][y];
            svg += `<rect x="${x*4}" y="${y*4}" width="4" height="4" fill="${color}"/>`;
        }
    }
    svg+="</svg>"
    return svg;
}

let images;
let levels;

async function setup() {
    noCanvas(); 
    await new Promise(r => done=r);
    const file = await handle.getFileHandle("textures.proj", {create: true})
    const f = await file.getFile()
    let text = await f.text();
    if(text === "") {
        const f = await file.createWritable();
        text = JSON.stringify({

        })
        await f.write(text);
        await f.close();
    }
    images = JSON.parse(text);
    for(const [k, v] of Object.entries(images)) {
        const svg=makeSVG(v);
        $("#tile-textures").child(
            $.create("ce-option").value(k).html(`<div>${k}</div>`+svg)
        )
        $("#entity-textures").child(
            $.create("ce-option").value(k).html(`<div>${k}</div>`+svg)
        )
    }
    {
        const file = await handle.getFileHandle("levels.proj", {create: true})
        const f = await file.getFile()
        let text = await f.text();
        if(text === "") {
            const f = await file.createWritable();
            text = JSON.stringify({
                debug:false,
                tile_presets: [],
                entity_presets:{},
                levels:{},
            });
            await f.write(text);
            await f.close();
        }
        levels = JSON.parse(text);
    }
    $("#debug").checked(levels.debug);
    for(const preset of levels.tile_presets) {
        const v = $.create("button").html(makeSVG(images[preset])).child(
            $.create("button").text("x").css({
                background: "red"
            }).click(()=> {
                v.remove();
                requestAnimationFrame(() => {
                    select_tile($("#tile-presets").children.at(-1))
                    if(!levels.levels[$("#levels-select").value()]) return;
                    levels.tile_presets = levels.tile_presets.filter(v=>v !== preset);
                    for(const level of Object.values(levels.levels)) {
                        removeid(level.layer1, preset)
                        removeid(level.layer2, preset)
                        removeid(level.layer3, preset)
                    }
                })
            })
        ).value(preset);
        $("#tile-presets").child(v);
        v.click(() => {
            select_tile(v);
        })
        select_tile(v);
    }
    for(const key of Object.keys(levels.levels)) {
        $("#levels-select").child($.create("option").value(key).text(key)) 
    }
    const level = levels.levels[$("#levels-select").value()];
    if(level) $("#picker").value(level.bg);

    for(const [id,preset] of Object.entries(levels.entity_presets)) {
        const v = $.create("button").html(makeSVG(images[preset.editor_texture])).child(
            $.create("button").text("x").css({
                background: "red",
            }).click(()=> {
                v.remove();
                requestAnimationFrame(() => {
                    select_tile($("#entity-presets").children.at(-1))
                    if(!levels.levels[$("#levels-select").value()]) return;
                    delete levels.entity_presets[id];
                    for(const level of Object.values(levels.levels)) {
                        level.entities = level.entities.filter(v => v.id !== id)
                    }
                })
            })
        ).value(id);
        $("#entity-presets").child(v);
        v.click(() => {
            select_tile(v);
        })
        select_tile(v);
    }

    $("#tile-presets").children.at(-1)?.class("selected")
    createCanvas(600, 600);
    $("#editor").css({display: "block"});
}


$("#add").click(() => {
    const n = prompt("name")?.replaceAll(/\s/g, "-");
    if(levels.levels[n] || n == "" || n == null || n == undefined) return;
    levels.levels[n] = {
        bg: "#00e6ffff",
        entities: [],
        layer1: Array(14).fill().map(v => Array(14).fill(null)), //bg
        layer2: Array(14).fill().map(v => Array(14).fill(null)), //interactive
        layer3: Array(14).fill().map(v => Array(14).fill(null)), //fg
    };
    $("#picker").value("#00e6ffff");
    $("#levels-select").child($.create("option").value(n).text(n)).value(n)
}) 
$("#delete").click(() => {
    if($("#levels-select").value() == "") return;
    delete levels.levels[$("#levels-select").value()]
    $(`#levels-select>[value="${$("#levels-select").value()}"]`).remove();
})
$("#copy").click(() => {
    const n = prompt("name")?.replaceAll(/\s/g, "-");
    if(levels.levels[n] || n == "" || n == null || n == undefined) return;
    levels.levels[n] = structuredClone(levels.levels[$("#levels-select").value()]);
    $("#levels-select").child($.create("option").value(n).text(n)).value(n)
});
$("#rename").click(() => {
    const n = prompt("name")?.replaceAll(/\s/g, "-");
    if(levels.levels[n] || n == "" || n == null || n == undefined) return;
    levels.levels[n] = levels.levels[$("#levels-select").value()] 
    delete levels.levels[$("#levels-select").value()]
    $(`#levels-select>[value="${$("#levels-select").value()}"]`).remove();
    $("#levels-select").child($.create("option").value(n).text(n)).value(n)
});

$("#levels-select").on("change", () => {
    const level = levels.levels[$("#levels-select").value()];
    $("#picker").value(level.bg);
})

function draw_tile(ix, iy, name) {
    if(!draw_tile.tiles.has(name)) {
        const p = createGraphics(w, h);
        draw_tile.tiles.set(name, p)
        const v = images[name]; 
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const color = v[x][y];
                p.fill(color);
                p.stroke(color);
                p.rect(x*pw, y*ph, pw, ph);
            }
        }
    }
    noStroke();
    image(draw_tile.tiles.get(name), ix, iy);
}
draw_tile.tiles = new Map;

function draw_layer(l) {
    for(let x = 0; x < 14; x++) {
        for(let y = 0; y < 14; y++) {
            if(l[x][y]) {
                draw_tile(x*w, y*h, l[x][y]);
            } 
        }
    }
}

let selected = null;

$("#debug").on("change", () => {
    levels.debug = $("#debug").checked()
})

$("#editor-select").on("change", () => {
    const v = $("#editor-select").value();
    selected = null;
    select_tile();
    if(v == "tile") {
        $("#tile-presets-").css({display:"block"});
        $("#entity-presets-").css({display:"none"});
        select_tile($("#tile-presets").children.at(-1))
    } else {
        $("#tile-presets-").css({display:"none"});
        $("#entity-presets-").css({display:"block"});
        select_tile($("#entity-presets").children.at(-1))
    }
})



function draw_entities(ents) {
    for(const e of ents) {
        if(selected === e) {
            fill("#ff000088")
            rect(e.pos.x, e.pos.y, w, h);
        }
        draw_tile(e.pos.x, e.pos.y, levels.entity_presets[e.id].editor_texture);
    }
}
let clicked = false;

function mousePressed() {
    clicked = true;
}

function keyPressed() {
    if (key == BACKSPACE && selected && mouseX < width) {
        const level = levels.levels[$("#levels-select").value()];
        const idx = level.entities.indexOf(selected);
        level.entities.splice(idx, 1);
        selected = false;
    }
}

function draw() {
    if(!levels.levels[$("#levels-select").value()]) return;
    const v = $("#editor-select").value();
    const level = levels.levels[$("#levels-select").value()];
    level.bg = $("#picker").value();
    noTint();
    background(level.bg);

    if(($("#layer-select-tile").value() !== "layer1" || $("#editor-select").value() === "entity") && $("#onion").checked()) {
        tint(255, 255, 255, 100);
    } else {
        noTint();
    }
    draw_layer(level.layer1);
    if(($("#layer-select-tile").value() !== "layer2" || $("#editor-select").value() === "entity") && $("#onion").checked()) {
        tint(255, 255, 255, 100);
    } else {
        noTint();
    }
    draw_layer(level.layer2);
    if($("#editor-select").value() !== "entity" && $("#onion").checked()) {
        tint(255, 255, 255, 100);
    } else {
        noTint();
    }
    draw_entities(level.entities);
    if(($("#layer-select-tile").value() !== "layer3" || $("#editor-select").value() === "entity") && $("#onion").checked()) {
        tint(255, 255, 255, 100);
    } else {
        noTint();
    }
    draw_layer(level.layer3);
    noTint();
    if(v==="tile") {
        const x = floor(mouseX/w);
        const y = floor(mouseY/h);
        noFill();
        stroke(0);
        rect(x*w, y*h, w, h);
        if(mouseIsPressed) {
            try {
                level[$("#layer-select-tile").value()][x][y] = mouseButton.left? $(".selected").value(): null;
            } catch(e) {}
        }
    } else {
        const x = mouseX-w/2;
        const y = mouseY-h/2;
        noFill();
        stroke(0);
        rect(x, y, w, h);

        if(selected && keyIsDown(" ") && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
            selected.pos.x = x;
            selected.pos.y = y;
        }
        if(!selected) {
            $("#fields-editor").html("");
        }
        if($(".selected")) {
            if(clicked && mouseX < width) {
                if(mouseButton.left && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
                    const fields = {};
                    for(const f of $("#fields").children) {
                        const id = f.value();
                        const v = f.$(".value").getProp("type") === "checkbox"? f.$(".value").checked(): f.$(".value").value()
                        fields[id] = v;
                    }
                    level.entities.push({
                        id: $(".selected").value(),
                        fields,
                        pos: {x, y},
                    })
                } else {
                    if(selected) {
                        selected = null;
                    } else {
                        for(const e of level.entities) {
                            if(
                                mouseX > e.pos.x && mouseX < e.pos.x + w &&
                                mouseY > e.pos.y && mouseY < e.pos.y + h
                            ) {
                                selected = e; 
                                const preset = levels.entity_presets[selected.id]
                                $("#fields-editor").html("");
                                for(const [k, v] of Object.entries(preset.fields)) {
                                    $("#fields-editor").child($.create("div").value(k).child([
                                        $.create("label").text(k + ": "),
                                        $.create("input").props({type: v.type}).class("value").value(selected.fields[k]).on("change", (v) => {
                                            selected.fields[k] = v.type === "checkbox"?v.target.checked: v.target.value;
                                        }),
                                    ])) 
                                }

                            }
                        }
                    }
                }
            }
        }
        clicked = false;
    }
}


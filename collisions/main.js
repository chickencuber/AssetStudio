document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});
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

/**
    * @import * from "p5/global"
    */

const pw = 600/16;
const ph = 600/16;


const w = 600/4;
const h = 600/4;


function get_texture() {
    return new Promise((r) => {
        $("#select").showModal();
        function click() {
            r(true);
            $("#ok").removeEvent("click", click)
            $("#select").removeEvent("close", close)
            $("#select").close();
        }
        function close() {
            r(false);
            $("#ok").removeEvent("click", click)
            $("#select").removeEvent("close", close)
            $("#select").close();
        }
        $("#ok").click(click)
        $("#select").on("close", close);
    })
}

$("#delete").click(() => {
    if($("#texture").value() == "") return;
    delete meta[$("#texture").value()]
    $(`#texture>[value="${$("select").value()}"]`).remove();
})

function to_ron(m) {
    return `Metadata(collisions: [${m.collision.map(v=>`[${v.toString()}]`).toString()}], top: ${m.up}, bottom: ${m.down}, left: ${m.left}, right: ${m.right})`
}

$("#save").click(async () => {
    const file = await handle.getFileHandle("meta.proj", {create: true})
    const f = await file.createWritable();
    await f.write(JSON.stringify(meta))
    await f.close();

    let ron = "{"
    for(const [k, v] of Object.entries(meta)) {
        ron += `"${k}":${to_ron(v)},`
    }
    ron += "}"
    {
        const file = await handle.getFileHandle("meta.ron", {create: true})
        const f = await file.createWritable();
        await f.write(ron)
        await f.close();
    }


    alert("you can now close the window")
})


$("#add").click(async () => {
    let c = await get_texture();
    if(!c) return;
    const k = $("#textures").value();
    if(meta[k]) return;
    meta[k] = {
        collision: Array(4).fill().map(v => Array(4).fill(true)),
        up:true,
        down: true,
        left: true,
        right: true,
    } 
    $("#texture").child($.create("option").value(k).text(k))
    $("#texture").value(k);
    $("#up").checked(meta[$("#texture").value()].up) 
    $("#down").checked(meta[$("#texture").value()].down) 
    $("#left").checked(meta[$("#texture").value()].left) 
    $("#right").checked(meta[$("#texture").value()].right) 
})    

$("#texture").on("change", () => {
    if(!meta[$("#texture").value()]) return;
    $("#up").checked(meta[$("#texture").value()].up) 
    $("#down").checked(meta[$("#texture").value()].down) 
    $("#left").checked(meta[$("#texture").value()].left) 
    $("#right").checked(meta[$("#texture").value()].right) 
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


let done;
let handle;
$("#open").click(async () => {
    handle = await window.showDirectoryPicker({
        mode: "readwrite"
    });
    done();
    $("#open").remove();
});

let textures;
let meta;
async function setup() {
    noCanvas()
    await new Promise(r => done=r);
    const file = await handle.getFileHandle("textures.proj", {create: true})
    const f = await file.getFile()
    let text = await f.text();
    if(text === "") {
        const f = await file.createWritable();
        await f.write("{}");
        await f.close();
        text = "{}"
    }
    textures = JSON.parse(text);
    for(const [k, v] of Object.entries(textures)) {
        const svg=makeSVG(v);
        $("#textures").child(
            $.create("ce-option").value(k).html(`<div>${k}</div>`+svg)
        )
    }

    {
        const file = await handle.getFileHandle("meta.proj", {create: true})
        const f = await file.getFile()
        let text = await f.text();
        if(text === "") {
            const f = await file.createWritable();
            await f.write("{}");
            await f.close();
            text = "{}"
        }
        meta = JSON.parse(text);

        for(const k of Object.keys(meta)) {
            $("#texture").child(
                $.create("option").value(k).text(k)
            )
            $("#up").checked(meta[$("#texture").value()].up) 
            $("#down").checked(meta[$("#texture").value()].down) 
            $("#left").checked(meta[$("#texture").value()].left) 
            $("#right").checked(meta[$("#texture").value()].right) 
        }
    }
    createCanvas(600, 600);

    $("#editor").css({display: "block"});
}

$("#up").on("change", () => {
    if($("#texture").value() == "") return;
    meta[$("#texture").value()].up = $("#up").checked();
})
$("#down").on("change", () => {
    if($("#texture").value() == "") return;
    meta[$("#texture").value()].down = $("#down").checked();
})
$("#left").on("change", () => {
    if($("#texture").value() == "") return;
    meta[$("#texture").value()].left = $("#left").checked();
})
$("#right").on("change", () => {
    if($("#texture").value() == "") return;
    meta[$("#texture").value()].right = $("#right").checked();
})

function draw() {
    const s = $("#texture").value()
    if(!textures[s]) return

    const x = floor(mouseX/w);
    const y = floor(mouseY/h);
    clear(0, 0, 0, 0);
    for(let x = 0; x < 16; x++) {
        for(let y = 0; y < 16; y++) {
            fill(textures[s][x][y]);
            stroke(textures[s][x][y])
            rect(x*pw, y*ph, pw, ph);
        }
    }


    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(meta[s].collision[x][y]) {
                fill("#ff000055")
                rect(x*w, y*h, w, h);
            }
        }
    }

    noFill();
    stroke(0);
    rect(x*w, y*h, w, h);

    if(mouseIsPressed) {

        if(x < 4 && x >= 0 &&  y < 4 && y >=0) {
            meta[s].collision[x][y] = mouseButton.left;
        }
    }
}

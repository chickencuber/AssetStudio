document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});
/**
    * @import * from "p5/global"
    */

    const w = 600/16;
const h = 600/16;
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
let json;
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
    json = JSON.parse(text);
    for(const n of Object.keys(json)) {
        $("#texture").child($.create("option").value(n).text(n)).value(n)        
    }
    createCanvas(600, 600);

    $("#editor").css({display: "block"});
}
$("#add").click(() => {
    const n = prompt("name")?.replaceAll(/\s/g, "-");
    if(json[n] || n == "" || n == null || n == undefined) return;
    json[n] = Array(16).fill().map(v => Array(16).fill("#00000000"))
    $("#texture").child($.create("option").value(n).text(n)).value(n)
}) 
$("#delete").click(() => {
    if($("#texture").value() == "") return;
    delete json[$("#texture").value()]
    $(`#texture>[value="${$("select").value()}"]`).remove();
})
$("#fliph").click(() => {
    if($("#texture").value() == "" || !json[$("#texture").value()]) return;
    const s = $("#texture").value();
    json[s].reverse();
})
$("#fliph").click(() => {
    if($("#texture").value() == "" || !json[$("#texture").value()]) return;
    const s = $("#texture").value();
    for(const g of json[s]) {
        g.reverse();
    }
})
$("#save").click(async () => {
    const file = await handle.getFileHandle("textures.proj", {create: true})
    const f = await file.createWritable();
    await f.write(JSON.stringify(json))
    await f.close();

    const s = getAtlasSize(Object.keys(json).length);
    const ts = 700;
    const c = createGraphics(s*ts, s*ts);
    const ps = ts/16;
    let x = 0; 
    let y = 0;
    const map = {
        size: ts,
        mapping: {

        }
    }

    for(const [k, v] of Object.entries(json)) {
        map.mapping[k] = [x, y]
        for(let tx = 0; tx < 16; tx++) {
            for(let ty = 0; ty < 16; ty++) {
                c.fill(v[tx][ty]);
                c.stroke(v[tx][ty]);
                c.rect(x*ts+tx*ps, y*ts+ty*ps, ps, ps);
            }
        }
        x++;
        if(x >= s) {
            x=0;
            y++;
        }
    }
    {
        const file = await handle.getFileHandle("textures.ron", {create: true})
        const f = await file.createWritable();
        const ron = `(size: ${map.size},mapping:${JSON.stringify(map.mapping).replace(/\[/g, "(").replace(/\]/g, ")")},)`;
        await f.write(ron);
        await f.close();
    }

    const dataURL = c._renderer.canvas.toDataURL("image/png");
    const base64 = dataURL.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    {
        const file = await handle.getFileHandle("textures.png", {create: true})
        const f = await file.createWritable();
        await f.write(bytes);
        await f.close();
    }
    c.remove();
    alert("its now safe to close the window")
})

function getAtlasSize(count) {
    return ceil(sqrt(count * 16**2)/16)
}

function keyPressed() {
    if($("#texture").value() == "" || !json[$("#texture").value()]) return;
    const s = $("#texture").value();
    const x = floor(mouseX/w);
    const y = floor(mouseY/h);
    if(key === "e") {
        $("#picker").value(json[s][x][y]);        
    }
}


$("#rename").click(() => {
    const n = prompt("name")?.replaceAll(/\s/g, "-");
    if(json[n] || n == "" || n == null || n == undefined) return;
    json[n] = json[$("#texture").value()] 
    delete json[$("#texture").value()]
    $(`#texture>[value="${$("select").value()}"]`).remove();
    $("#texture").child($.create("option").value(n).text(n)).value(n)
});

$("#copy").click(() => {
    const n = prompt("name")?.replaceAll(/\s/g, "-");
    if(json[n] || n == "" || n == null || n == undefined) return;
    json[n] = structuredClone(json[$("#texture").value()]);
    $("#texture").child($.create("option").value(n).text(n)).value(n)
});

function draw() {
    if($("#texture").value() == "" || !json[$("#texture").value()]) return;
    const s = $("#texture").value();
    const x = floor(mouseX/w);
    const y = floor(mouseY/h);
    clear(0, 0, 0, 0);
    for(let x = 0; x < 16; x++) {
        for(let y = 0; y < 16; y++) {
            fill(json[s][x][y]);
            stroke(json[s][x][y])
            rect(x*w, y*h, w, h);
        }
    }
    noFill();
    stroke(0);
    rect(x*w, y*h, w, h);
    if(mouseIsPressed) {
        try {
            json[s][x][y] = mouseButton.left? $("#picker").value(): "#00000000";
        } catch(e) {
            console.log(e)
        }
    }
}

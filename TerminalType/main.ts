import { devNull } from "node:os";
import { TUIElementI, TUI, genTUIBox, genTUIText, TUITextI, TUIRowI, genTUIRow, ConsoleString } from "../TUI/TUIData.ts";
import { generate } from 'random-words';

const decoder = new TextDecoder(), buffer = new Uint8Array(4);
let length = 5;
while (true){
    let key = '';
    const menu = new TUI([
        genTUIBox([
            genTUIRow(
                [
                    {
                        margin_left: 0,
                        element: genTUIText("Generating text with a length of", { styles: ["Reset"] })
                    },
                    {
                        margin_left: 1,
                        element: genTUIText(length + "", { color: "Red", styles: ["Underline"] }, { override: false, func: (self, _value) => (self as TUITextI).value = length + ""})
                    }
                ],
                {
                    override: true,
                    func: (self, value) => {
                        (self as TUIRowI).objects.forEach(object => object.element.update(object.element, value));
                        self.data.width = (self as TUIRowI).objects.reduce((output, current) => output + current.margin_left + current.element.data.width, 0);
                    }
                }
            )
        ], "Terminal Type", { color: "Blue" })
    ]);

    menu.start(true);

    while (true) {
        menu.render();
        const read = (await Deno.stdin.read(buffer)) || 0;
        if ((key = decoder.decode(buffer)).at(0) == '\x03') { // Ctrl+C to exit
            menu.exit();
            Deno.exit();
        } else if (key.at(0) == '\x0D') {
            menu.exit();
            break;
        } else if (key.at(0) == '\x1B' && key.at(1) == '\x5B') {
            switch (key.at(2)) {
                case '\x41': // A
                    length = Math.min(100, ++length);
                    key = "up arrow";
                    break;
                case '\x42': // B
                    length = Math.max(1, --length);
                    key = "down arrow";
                    break;
                case '\x43': // C
                    length = Math.min(100, ++length);
                    key = "right arrow";
                    break;
                case '\x44': // D
                    length = Math.max(1, --length);
                    key = "left arrow";
                    break;
                default:
                    key = "special";
            }
        } else {
            key = key.slice(0, read);
        }
        menu.update(key);
    }

    let temp: string | string[];

    const data = typeof (temp = generate(length)) == "string" ? temp : temp.reduce((output, current) => output + " " + current, "").substring(1);

    let Tpos: number = 0, wpm = 0;

    const statsBox = genTUIBox([genTUIText("You have been givin " + length + " random words to type out\nTry to type them as fast as possible. Stats will show up here as you type.", { styles: ["Reset"] })], "Stats", { color: "Blue" }),
    gameText: TUITextI = { type: "Text", value: "0", data: { width: data.length, height: 1 }, render: (_self, _width, _height) => [new ConsoleString([{ text: data.substring(0, Tpos), styleCode: "\x1b[4;37m\x1b[34m" }, { text: data.substring(Tpos, Tpos + 1), styleCode: "\x1b[s\x1b[0m"}, { text: data.substring(Tpos + 1), styleCode: "\x1b[30m" }])], update: () => null},
    gameBox = genTUIBox([gameText], "Terminal Type", { color: "Blue" }),
    cursorHandler: TUIElementI = { type: "Custom", data: { width: 0, height: 0 }, render: (_self, _width, _height) => [new ConsoleString([{ text: "", styleCode: "\x1b[u" }])], update: () => null };

    const game = new TUI([
        statsBox,
        gameBox,
        cursorHandler
    ]);

    game.start(false);
    game.render();

    let read = await Deno.stdin.read(buffer) || 0;

    const time = Date.now();

    statsBox.objects = [
        genTUIText("0/" + length, { color: "Green", styles: [ "Underline" ] }, { override: false, func: (self, value) => {
            if (value != " ") return;
            (self as TUITextI).value = parseInt((self as TUITextI).value.substring(0, 1)) + 1 + "/" + length;
        } }),
        genTUIText("0 WPM", { color: "Green", styles: [ "Underline" ] }, { override: false, func: (self, _value) => {
            (self as TUITextI).value = (wpm = Math.round((Tpos / 5) / ((Date.now() - time) / 60000))) + " WPM";
        } })
    ]

    while (true) {
        if ((key = decoder.decode(buffer)).at(0) == '\x03') { // Ctrl+C to exit
            game.exit();
            Deno.exit();
        } else if ((key = key.substring(0, read)) == data[Tpos]) {
            if (++Tpos == data.length) break;
        }
        game.update(key);
        game.render();
        read = (await Deno.stdin.read(buffer)) || 0;
    }

    game.exit();

    const stats = new TUI([
        gameBox,
        genTUIBox([
            genTUIText("Heres how you did:"),
            { type: "Text", data: { height: 1, width: (wpm + " WPM").length }, update: () => null, render: (_self, _width, _height) => [new ConsoleString([{ text: wpm + "", styleCode: "\x1b[4;37m\x1b[31m" }, { text: " WPM", styleCode: "\x1b[0m\x1b[32m" }])], },
            { type: "Text", data: { height: 1, width: (length + " Words").length }, update: () => null, render: (_self, _width, _height) => [new ConsoleString([{ text: length + "", styleCode: "\x1b[4;37m\x1b[31m" }, { text: " Words", styleCode: "\x1b[0m\x1b[32m" }])], },
            { type: "Text", data: { height: 1, width: (Tpos + " Characters").length }, update: () => null, render: (_self, _width, _height) => [new ConsoleString([{ text: Tpos + "", styleCode: "\x1b[4;37m\x1b[31m" }, { text: " Characters", styleCode: "\x1b[0m\x1b[32m" }])], }
        ], "Post-game Stats", { color: "Blue" })
    ]);

    stats.start(true);

    while (key.at(0) != '\x0D') {
        if (key.at(0) == '\x03') {
            stats.exit();
            Deno.exit();
        }
        stats.render();
        read = (await Deno.stdin.read(buffer)) || 0;
        key = decoder.decode(buffer);
    }
}

Deno.exit(0);
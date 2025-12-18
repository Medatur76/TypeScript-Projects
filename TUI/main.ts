import { TUI, genTUIBox, genTUIText, TUITextI, genTUIRow, ConsoleString, textOptionsMap } from "./TUIData.ts";

const decoder = new TextDecoder(), buffer = new Uint8Array(4);
let number = 0, key = '', selection = 0;
const tui = new TUI([
        genTUIBox([
                genTUIText("Hello World!"),
                genTUIText("You have entered 0 characters", {}, 
                    {
                        override: true, 
                        func: (self, _value) => 
                            self.data.width = ((self as TUITextI).value = `You have entered ${number} characters`).length 
                    })
            ], "Test"),
        genTUIBox([
            genTUIText("Hello", { color: "Gold" })
        ], "Testing Colors", { color: "Green" }),
        genTUIText("Hello, World!\n", { color: "Cyan", styles: [ "Bold", "Underline" ] }),
        genTUIRow([
            {
                element: genTUIBox([
                    genTUIText("Please press a key", {},
                        {
                            override: true,
                            func: (self, key) => {
                                self.data.width = ((self as TUITextI).value = "You have pressed " + key).length;
                            }
                        })
                ], "Testing Rows 1"),
                margin_left: 2
            },
            {
                element: genTUIBox([
                    genTUIText("Please press enter on\noptions A, B, or C", {}, { override: true, func: (self, value) => {
                        const s = ["A", "B", "C"][selection];
                        if (value == "enter") self.render = (_self,_width,_height) => [new ConsoleString([{text:"You have selected:"}]), new ConsoleString([{ text: "Option " }, { text: s, styleCode: textOptionsMap({ color: "Green", styles: ["Underline"] }) }]).append({ text: "", styleCode: "\x1b[0m" })];
                        else if (value == "delete") self.render = (self, _width, _height) => (self as TUITextI).value.split("\n").map((value) => new ConsoleString([{ text: value }]).append({ text: "", styleCode: "\x1b[0m" }));
                    } })
                ], "Testing Rows 2"),
                margin_left: 5
            },
            {
                element: genTUIText("\nOption C", { color: "Red" }, { override: true, func: (self, _value) => {
                    if (selection == 2) self.render = (_self,_width,_height) => [new ConsoleString([{text:""}]), new ConsoleString([{ text: "Option C", styleCode: textOptionsMap({ color: "Green", styles: [{ type: "Background", color: "Black" }] }) }]).append({ text: "", styleCode: "\x1b[0m" })];
                    else self.render = (_self,_width,_height) => [new ConsoleString([{text:""}]), new ConsoleString([{ text: "Option C", styleCode: textOptionsMap({ color: "Red" })}]).append({ text: "", styleCode: "\x1b[0m" })];
                } }),
                margin_left: 2
            }
        ]),
        genTUIRow([
            {
                element: genTUIText("Option A", { color: "Green", styles: [{ type: "Background", color: "Black" }] }, { override: true, func: (self, _value) => {
                    if (selection == 0) self.render = (_self,_width,_height) => [new ConsoleString([{ text: "Option A", styleCode: textOptionsMap({ color: "Green", styles: [{ type: "Background", color: "Black" }] }) }]).append({ text: "", styleCode: "\x1b[0m" })];
                    else self.render = (_self,_width,_height) => [new ConsoleString([{ text: "Option A", styleCode: textOptionsMap({ color: "Red" })}]).append({ text: "", styleCode: "\x1b[0m" })];
                } }),
                margin_left: 0
            },
            {
                element: genTUIText("Option B", { color: "Red" }, { override: true, func: (self, _value) => {
                    if (selection == 1) self.render = (_self,_width,_height) => [new ConsoleString([{ text: "Option B", styleCode: textOptionsMap({ color: "Green", styles: [{ type: "Background", color: "Black" }] }) }]).append({ text: "", styleCode: "\x1b[0m" })];
                    else self.render = (_self,_width,_height) => [new ConsoleString([{ text: "Option B", styleCode: textOptionsMap({ color: "Red" })}]).append({ text: "", styleCode: "\x1b[0m" })];
                } }),
                margin_left: 3
            }
        ])
    ]);

tui.start(true);

while (true) {
    tui.render();
    const read = (await Deno.stdin.read(buffer)) || 0;
    if ((key = decoder.decode(buffer)).at(0) == '\x03') { // Ctrl+C to exit
        tui.exit();
    } else if (key.at(0) == '\x0D') {
        key = "enter";
    } else if (key.at(0) == '\x7F') {
        number = 0;
        key = "delete";
    } else if (key.at(0) == '\x1B' && key.at(1) == '\x5B') {
        switch (key.at(2)) {
            case '\x41': // A
                selection = 2;
                key = "up arrow";
                break;
            case '\x42': // B
                selection = selection != 2 ? selection : 1;
                key = "down arrow";
                break;
            case '\x43': // C
                selection = Math.min(selection + 1, 2);
                key = "right arrow";
                break;
            case '\x44': // D
                selection = Math.max(selection - 1, 0);
                key = "left arrow";
                break;
            default:
                number--;
                key = "special";
        }
    } else {
        number++;
        key = key.slice(0, read);
    }
    tui.update(key);
}
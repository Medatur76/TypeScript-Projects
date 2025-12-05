import { TUI, genTUIBox, genTUIText, TUITextI } from "./TUIData.ts";

const decoder = new TextDecoder(), buffer = new Uint8Array(1);
let number = 0, key = '';
const tui = new TUI([
        genTUIBox([
                genTUIText("Hello World!"),
                genTUIText("You have entered 0 characters", {}, 
                    {
                        override: true, 
                        func: (self, _value, _parent) => 
                            self.data.width = ((self as TUITextI).value = `You have entered ${number} characters`).length 
                    })
            ], "Test"),
        genTUIBox([
            genTUIText("Hello", { color: "Gold" })
        ], "Testing Colors", { color: "Green" }),
        genTUIText("Hello, World!", { color: "Cyan", styles: [ "Bold", "Underline" ] })
    ]);

tui.start(true);

while (true) {
    tui.render();
    await Deno.stdin.read(buffer);
    if ((key = decoder.decode(buffer)) == '\x03') { // Ctrl+C to exit
        console.clear();
        tui.write('\x1b[?25h'); // Show cursor
        Deno.exit();
    } else {
        number++;
        tui.update(key);
    }
};
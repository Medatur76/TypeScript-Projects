import { TUI, genTUIBox, genTUIText, TUITextI, TUIRowI, genTUIRow, ConsoleString, textOptionsMap } from "../TUI/TUIData.ts";

const decoder = new TextDecoder(), buffer = new Uint8Array(4);
let length = 5, key = '';
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
                    element: genTUIText("5", { color: "Red", styles: ["Underline"] }, { override: false, func: (self, _value) => (self as TUITextI).value = length + ""})
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
    } else if (key.at(0) == '\x0D') {
        menu.exit();
        break;
    }else if (key.at(0) == '\x1B' && key.at(1) == '\x5B') {
        switch (key.at(2)) {
            case '\x41': // A
                length++;
                key = "up arrow";
                break;
            case '\x42': // B
                length--;
                key = "down arrow";
                break;
            case '\x43': // C
                length++;
                key = "right arrow";
                break;
            case '\x44': // D
                length--;
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

const statsBox = {  }

const game = new TUI([
    
]);
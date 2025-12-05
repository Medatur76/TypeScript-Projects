interface TUIElement {
    render: (width: number, height: number) => void;
}

class TUI {
    constructor() {
    }

    public render(): void {
        
    }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function write(message: string) {
    Deno.stdout.write(encoder.encode(message));
}

// Set terminal to raw mode
Deno.stdin.setRaw(true);
//process.stdin.resume();
//process.stdin.setEncoding('utf8');

// Clear the screen
write('\x1b[2J');
write('\x1b[0;0H'); // Move cursor to top-left

let text = '', key = '';
const buffer = new Uint8Array(1);

render();

while (true) {
    await Deno.stdin.read(buffer);
    key = decoder.decode(buffer);
    if (key === '\x03') { // Ctrl+C to exit
        write('\x1b[2J'); // Clear screen on exit
        write('\x1b[?25h'); // Show cursor
        Deno.exit();
    } else if (key === '\r') { // Enter key
        text = ''; // Clear text on Enter
    } else if (key === '\x7f') { // Backspace
        text = text.slice(0, -1);
    } else {
        text += key;
    }
    render();
};

function render() {
    write('\x1b[2J'); // Clear current line
    write(`\nType something: ${text}\nhi${text.length}`);
    write(`\x1b[${text.length + 16};0H`); // Move cursor to top-left
}
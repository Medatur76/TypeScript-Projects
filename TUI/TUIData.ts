type element = "Row" | "Box" | "Text";
type data = {
    width: number,
    height: number
};
type color = "Black" | "Red" | "Green" | "Gold" | "Blue" | "Purple" | "Cyan" | "White";
const colorMap = {
    "Black": "30m",
    "Red": "31m",
    "Green": "32m",
    "Gold": "33m",
    "Blue": "34m",
    "Purple": "35m",
    "Cyan": "36m",
    "White": "37m"
}
type style = "Bold" | "Underline" | "Reset";
type textOptions = {
    color?: color;
    styles?: style[];
};
function textOptionsMap(txtOpt?: textOptions): string {
    if (!txtOpt || (!txtOpt.color && !txtOpt.styles)) return "";
    if (!txtOpt.styles) return "\x1b[0;" + colorMap[txtOpt.color ?? "White"];
    if (txtOpt.styles?.includes("Reset")) return "\x1b[0m";
    let output = "";
    for (const style of txtOpt.styles) {
        output += "\x1b[" + (style == "Bold" ? "1" : "4") + ";37m";
    }
    return output.substring(0, output.length-3) + colorMap[txtOpt.color ?? "White"];
}
type funcOverride<K> = {
    func: K;
    override: boolean;
};

export interface TUIElementI {
    type: element;
    data: data;
    render: (self: TUIElementI, width: number, height: number, parent: TUI) => string;
    update: (self: TUIElementI, value: string, parent?: TUI) => void;
}

export interface TUIRowI extends TUIElementI {
    type: "Row";
    objects: TUIElementI[];
}

export interface TUIBoxI extends TUIElementI {
    type: "Box";
    objects: TUIElementI[];
}

export function genTUIBox(objects?: TUIElementI[], title?: string, opt?: textOptions, updateOverride?: funcOverride<(self: TUIElementI, value: string, parent?: TUI) => void>): TUIBoxI {
    return { type: "Box", objects: objects ? objects : [], data: { width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0, height: (objects ? objects.length : 0) + 2 }, render: (self, width, height, parent) => {
        const style = textOptionsMap(opt);
        let output = style + "╭";
        if (title) output += "─" + title + "─".repeat(self.data.width - title.length - 1);
        else output += "─".repeat(self.data.width);
        output += "╮\n";
        for (const element of (self as TUIBoxI).objects) output += "│ "+ "\x1b[0m" + element.render(element, width, height, parent) + style+ " ".repeat(self.data.width - element.data.width - 1) + "│\n";
        return output + "╰" + "─".repeat(self.data.width) + "╯\n\x1b[0m";
    }, update: updateOverride && updateOverride.override ? updateOverride.func : (self, value, parent?) => {
        updateOverride ? updateOverride.func(self, value, parent) : null;
        (self as TUIBoxI).objects.forEach(object => object.update(object, value, parent));
        self.data = {
            width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0,
            height: (objects ? objects.length : 0) + 2
        };
    } };
}

export interface TUITextI extends TUIElementI {
    type: "Text";
    value: string;
}

export function genTUIText(value: string, opt?: textOptions, updateOverride?: funcOverride<(self: TUIElementI, value: string, parent?: TUI) => void>): TUITextI {
    return { type: "Text", data: { width: value.length, height: 1 }, value: value, render: (self, _width, _hight, _parent) => textOptionsMap(opt) + (self as TUITextI).value + "\x1b[0m", update: updateOverride ? updateOverride.func : (_self, _value, _parent) => null };
}

export class TUI {
    private elements: TUIElementI[] = [];
    private encoder = new TextEncoder;

    constructor(elements?: TUIElementI[]) {
        if (elements) this.elements = elements;
    }

    public write(message: string) {
        Deno.stdout.write(this.encoder.encode(message));
    }

    public start(hideCursor?: boolean): void {
        // Set terminal to raw mode
        Deno.stdin.setRaw(true);
        if (hideCursor) this.write('\x1b[?25l');
    }

    public render(): void {
        console.clear();
        this.write('\x1b[0;0H'); // Move cursor to top-left
        const {columns, rows} = Deno.consoleSize();
        let output = "";
        for (const element of this.elements)
            output += element.render(element, columns, rows, this);
        this.write(output);
    }

    public update(value: string): void {
        for (const element of this.elements)
            element.update(element, value, this);
    }
}
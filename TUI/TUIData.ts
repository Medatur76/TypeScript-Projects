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
type styledString = {
    text: string;
    styleCode?: string;
}
class ConsoleString {
    private text: string = "";
    public length: number = 0;

    constructor (string: styledString[]) {
        for (const stringI of string) {
            this.text += stringI.styleCode + stringI.text;
            this.length += stringI.text.length;
        }
    }

    public append(string: styledString): ConsoleString {
        this.text += string.styleCode + string.text;
        this.length += string.text.length;
        return this;
    }

    public appends(string: styledString[]): ConsoleString {
        for (const stringI of string) {
            this.text += stringI.styleCode + stringI.text;
            this.length += stringI.text.length;
        }
        return this;
    }

    public appendc(string: ConsoleString): ConsoleString {
        this.text += string.print();
        this.length += string.length;
        return this;
    }

    public appendcs(string: ConsoleString[]): ConsoleString {
        for (const stringI of string) {
            this.text += stringI.print();
            this.length += stringI.length;
        }
        return this;
    }

    public print(): string {
        return this.text;
    }
}
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

type renderFunc = (self: TUIElementI, width: number, height: number, parent: TUI) => ConsoleString[];
type updateFunc = (self: TUIElementI, value: string, parent?: TUI) => void;

type funcOverride<K> = {
    func: K;
    override: boolean;
};

export interface TUIElementI {
    type: element;
    data: data;
    render: renderFunc;
    update: updateFunc;
}

export interface TUIRowI extends TUIElementI {
    type: "Row";
    objects: {element: TUIElementI, margin_left: number}[];
}

export function genTUIRow(objects?: {element: TUIElementI, margin_left: number}[]): TUIRowI {
    return { type: "Row", objects: objects ?? [], data: { width: objects ? objects.reduce((output, current) => output + current.margin_left + current.element.data.width, 0) : 0, height: objects ? objects.reduce((max, current) => Math.max(max, current.element.data.height), 0) : 0}, render: (self, width, height, parent) => {
        const output: ConsoleString[] = [];
        let targetpos = 0;
        for (const object of (self as TUIRowI).objects) {
            const lines = object.element.render(object.element, width, height, parent);
            targetpos += object.margin_left;
            for (let i = 0; i < lines.length; i++) {
                if (!output[i]) output[i] = new ConsoleString([ { text: "" } ]);
                output[i].append({ text: " ".repeat(targetpos < output[i].length ? 0 : targetpos - output[i].length) }).appendc(lines[i]);
            }
            targetpos += object.element.data.width;
            if (object.element.type == "Box") targetpos += 2;
        }
        return output;
    }, update: (_self, _value, _parent) => null };
}

export interface TUIBoxI extends TUIElementI {
    type: "Box";
    objects: TUIElementI[];
}

export function genTUIBox(objects?: TUIElementI[], title?: string, opt?: textOptions, updateOverride?: funcOverride<updateFunc>): TUIBoxI {
    return { type: "Box", objects: objects ? objects : [], data: { width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0, height: (objects ? objects.length : 0) + 2 }, render: (self, width, height, parent) => {
        const style = textOptionsMap(opt), output = [new ConsoleString([{ text: "╭", styleCode: style }])];
        if (title) output[0].append({ text: "─" + title + "─".repeat(self.data.width - title.length - 1)});
        else output[0].append({ text: "─".repeat(self.data.width)});
        output[0].append({ text: "╮" });
        for (const element of (self as TUIBoxI).objects) output.push(new ConsoleString([{ text: "│ " }, { text: "", styleCode: "\x1b[0m" }]).appendcs(element.render(element, width, height, parent)).append({ text: " ".repeat(self.data.width - element.data.width) + "│", styleCode: style }));
        return [...output, new ConsoleString([{ text: "╰" + "─".repeat(self.data.width) + "╯" }, { text: "", styleCode: "\x1b[0m" }])];
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

export function genTUIText(value: string, opt?: textOptions, updateOverride?: funcOverride<updateFunc>): TUITextI {
    return { type: "Text", data: { width: value.length, height: 1 }, value: value, render: (self, _width, _hight, _parent) => (self as TUITextI).value.split("\n").map((value) => new ConsoleString([{ text: value, styleCode: textOptionsMap(opt) }])).map((value, index, array) => array.length - index == 1 ? value.append({ text: "", styleCode: "\x1b[0m" }) : value), update: updateOverride ? updateOverride.func : (_self, _value, _parent) => null };
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
        //Deno.stdin.setRaw(true);
        if (hideCursor) this.write('\x1b[?25l');
    }

    public render(): void {
        console.clear();
        this.write('\x1b[0;0H'); // Move cursor to top-left
        const {columns, rows} = Deno.consoleSize();
        const output: string[] = [];
        for (const element of this.elements)
            element.render(element, columns, rows, this).forEach(value => output.push(value.print()));
        for (let i = 0; i < rows && i < output.length; i++) {
            this.write(output[i] + "\n");
        }
    }

    public update(value: string): void {
        for (const element of this.elements)
            element.update(element, value, this);
    }
}